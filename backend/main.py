from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="MailX API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

# LLM: OpenCode Zen (free) or Direct DeepSeek (fallback)
# Get a Zen key: https://opencode.ai/zen
ZEN_API_KEY = os.getenv("ZEN_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

if ZEN_API_KEY:
    LLM_API_URL = "https://opencode.ai/zen/v1/chat/completions"
    LLM_MODEL = "deepseek-v4-flash-free"
    LLM_API_KEY = ZEN_API_KEY
elif DEEPSEEK_API_KEY:
    LLM_API_URL = "https://api.deepseek.com/v1/chat/completions"
    LLM_MODEL = "deepseek-chat"
    LLM_API_KEY = DEEPSEEK_API_KEY
else:
    LLM_API_URL = ""
    LLM_MODEL = ""
    LLM_API_KEY = ""


class ChatRequest(BaseModel):
    intent: str
    email_context: dict | None = None
    preferences: dict | None = None
    prompt: str | None = None
    conversation_id: str | None = None
    history: list[dict] | None = None


class ChatResponse(BaseModel):
    intent: str
    response: str
    actions: list[dict] = []


SYSTEM_PROMPTS = {
    "summarize": (
        "You are MailX, an AI email assistant. Summarize the email "
        "in 2-3 bullet points. Be factual and concise. "
        "Return ONLY bullet points, each starting with '•'.\n\n"
        "From: {sender}\nSubject: {subject}\nBody:\n{body}"
    ),
    "reply": (
        "You are MailX, an email assistant. Generate 3 reply options "
        "labeled R1, R2, R3. Vary slightly in tone. "
        "User preference: reply_tone = {tone}\n\n"
        "Email from: {sender}\nSubject: {subject}\nBody:\n{body}"
    ),
    "priority": (
        "You are MailX, a priority classifier. Classify this email "
        "as high/medium/low priority. Consider urgency, sender, "
        "and keywords.\n\n"
        "Sender: {sender}\nSubject: {subject}\nSnippet: {snippet}\n\n"
        "Return JSON: {{\"priority\": \"high|medium|low\", "
        "\"category\": \"action_required|fyi|scheduling|newsletter\", "
        "\"confidence\": 0.0-1.0}}"
    ),
    "tasks": (
        "You are MailX, a task extractor. Extract tasks from this email. "
        "Today's date is {today}.\n\n"
        "For each task return: description, assignee (\"me\" if directed "
        "at reader), dueDate (YYYY-MM-DD or null), priority (high/medium/low).\n\n"
        "Email from: {sender}\nSubject: {subject}\nBody:\n{body}\n\n"
        "Return ONLY a JSON array. No markdown."
    ),
    "draft": (
        "You are MailX, an email drafting assistant. Generate a complete "
        "email draft based on the user's request.\n\n"
        "Tone: {tone}\nToday's date: {date}\n\n"
        "User request: {prompt}\n\n"
        "Return JSON only: {{\"subject\": \"...\", "
        "\"greeting\": \"...\", \"body\": \"...\", \"signOff\": \"...\"}}"
    ),
}


def build_prompt(intent: str, ctx: dict | None, prefs: dict | None,
                 prompt: str | None) -> str:
    template = SYSTEM_PROMPTS.get(intent, "")
    if not template:
        return prompt or ""

    if intent == "draft":
        user_prompt = prompt or (ctx or {}).get("body", "")
        return template.format(
            tone=(prefs or {}).get("reply_tone", "professional"),
            date="2026-07-10",
            prompt=user_prompt,
        )

    if intent == "tasks":
        return template.format(
            sender=(ctx or {}).get("sender", "unknown"),
            subject=(ctx or {}).get("subject", ""),
            body=(ctx or {}).get("body", ""),
            today="2026-07-10",
        )

    if intent == "priority":
        return template.format(
            sender=(ctx or {}).get("sender", "unknown"),
            subject=(ctx or {}).get("subject", ""),
            snippet=(ctx or {}).get("snippet", ""),
        )

    return template.format(
        sender=(ctx or {}).get("sender", "unknown"),
        subject=(ctx or {}).get("subject", ""),
        body=(ctx or {}).get("body", ""),
        tone=(prefs or {}).get("reply_tone", "professional"),
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not LLM_API_KEY:
        raise HTTPException(status_code=500, detail="No API key configured. Set ZEN_API_KEY or DEEPSEEK_API_KEY in .env")

    system_content = build_prompt(
        req.intent, req.email_context, req.preferences, req.prompt
    )

    user_extra = req.prompt or (req.email_context or {}).get("body", "") if req.intent != "draft" else ""
    full_content = f"{system_content}\n\n{user_extra}".strip() if user_extra else system_content
    messages = [{"role": "user", "content": full_content}]
    if req.history:
        for msg in req.history[-6:]:
            messages.append(msg)

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            LLM_API_URL,
            headers={
                "Authorization": f"Bearer {LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": LLM_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 4096,
            },
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"LLM API error: {resp.status_code}",
        )

    data = resp.json()
    choices = data.get("choices", [])
    msg = choices[0]["message"] if choices else {}
    content = msg.get("content") or msg.get("reasoning_content") or ""

    return ChatResponse(
        intent=req.intent,
        response=content,
        actions=[{"label": "Copy", "action": "copy"},
                 {"label": "Regenerate", "action": "regenerate"}],
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
