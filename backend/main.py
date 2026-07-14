from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
import re
import asyncio
import json
from collections import defaultdict, deque
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv

ENV_DIR = Path(__file__).resolve().parent
load_dotenv(ENV_DIR / ".env", override=True)

app = FastAPI(title="MailX API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"chrome-extension://.*",
    allow_methods=["POST"],
    allow_headers=["*"],
)

REQUEST_LOG: dict[str, deque[datetime]] = defaultdict(deque)
RATE_LIMIT = 30
RATE_WINDOW = timedelta(minutes=1)

# LLM: OpenCode Zen (free) or Direct DeepSeek (fallback)
# Get a Zen key: https://opencode.ai/zen
ZEN_API_KEY = os.getenv("ZEN_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

if ZEN_API_KEY:
    LLM_API_URL = "https://opencode.ai/zen/v1/chat/completions"
    # MiMo is a non-reasoning free model, which makes short email features
    # responsive. Set ZEN_MODEL to use another Zen model explicitly.
    LLM_MODEL = os.getenv("ZEN_MODEL", "mimo-v2.5-free")
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


def has_summarizable_content(body: str) -> bool:
    return len(re.findall(r"[A-Za-z0-9\u0080-\uffff]", body)) >= 2


SYSTEM_PROMPTS = {
    "summarize": (
        "{body}\n\nSummarize this email with bullet points. Do not include "
        "metadata, analysis, or your perspective thoughts."
    ),
    "reply": (
        "You are MailX, an email assistant. Generate 3 reply options "
        "Return ONLY a JSON array of exactly three strings, one complete reply per string. "
        "Write as a real human replying directly to the sender, not as an AI assistant. "
        "Match the email's formality and length: short or casual messages need short, natural replies, "
        "not a formal greeting and sign-off. Use normal email paragraph spacing only when the reply is longer. "
        "Do not use canned phrases such as 'I received your message', 'thank you for your request', "
        "or 'to assist you' unless they genuinely fit the email. Do not include Subject:, Body:, Markdown, headings, or explanations. "
        "Use only facts explicitly present in the email. Never invent a search, request, "
        "task, name, relationship, or missing context. For a short or ambiguous message, "
        "write a short natural acknowledgement or ask one neutral clarification question. "
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
        return ""

    if intent == "draft":
        user_prompt = prompt or (ctx or {}).get("body", "")
        return template.format(
            tone=(prefs or {}).get("reply_tone", "professional"),
            date=date.today().isoformat(),
            prompt=user_prompt,
        )

    if intent == "tasks":
        return template.format(
            sender=(ctx or {}).get("sender", "unknown"),
            subject=(ctx or {}).get("subject", ""),
            body=(ctx or {}).get("body", ""),
            today=date.today().isoformat(),
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


def extract_summary_fact(item: str) -> str:
    quoted = re.match(r'^\s*["“](.+?)["”](?:\s+[—–-].*)?$', item)
    if quoted:
        item = quoted.group(1)
    else:
        item = re.split(r"\s+(?:—|–|--)\s+", item, maxsplit=1)[0]

    item = re.sub(
        r"^(?:first|second|third|fourth|fifth|sixth|\d+)\s*:\s*",
        "",
        item.strip(),
        flags=re.I,
    )
    item = re.sub(r"^(?:next urgent|then|finally)\s*:\s*", "", item, flags=re.I)
    item = re.sub(
        r"\s*\((?=[^)]*\b(?:urgent|priority|request|decision|next action|context|depends on)\b)[^)]*\)([.!?])?\s*$",
        r"\1",
        item,
        flags=re.I,
    )
    item = re.sub(
        r"^(?:(?:fact|point|item)\s*\d+|task|request|decision|deadline|date|next action|context|background)\s*:\s*",
        "",
        item,
        flags=re.I,
    )
    item = re.sub(r"^please\s+", "", item, flags=re.I)
    return item.lstrip('"“')


def is_summary_meta(item: str) -> bool:
    text = item.lower()
    if re.match(
        r"^(?:role|input|prompt|source|output format|word limit|prioritization|constraints|analyze the email body|greeting|sent by)\s*:",
        text,
    ) or "the email body is" in text:
        return True
    if re.search(r"\bpoint\s*\d+\b", text):
        return True
    if re.match(
        r"^(?:first|second|third|fourth|fifth|sixth)\s*,\s*(?:urgent deadlines?|decisions?|requests?|remaining context)\s*:",
        text,
    ):
        return True
    if re.match(
        r"^(?:urgent deadlines?|requests? and next actions?|remaining relevant context)\s*:",
        text,
    ):
        return True
    return any(phrase in text for phrase in (
        "might be considered",
        "not explicit",
        "with deadlines",
        "highest priority",
        "most urgent",
        "word count",
        "that's ",
        "depends on first point",
        "is a decision that needs",
    ))


def clean_summary(content: str) -> str:
    bullets = []
    final_bullets = []
    fallback = []

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("<think>") or line.startswith("</think>"):
            continue

        match = re.match(r"^(?:[•*-]|\d+[.)])\s*(.+)$", line)
        if match:
            item = match.group(1)
            if re.match(
                r"^for the (?:first|second|third|fourth) point\s*:", item, re.I
            ):
                continue
            final_match = re.match(r"^bullet\s*\d+\s*:\s*(.+)$", item, re.I)
            if final_match:
                final_bullets.append(final_match.group(1))
            else:
                bullets.append(item)
        elif not re.match(r"^(?:summary|main points?|key points?)\s*:$", line, re.I):
            fallback.append(line)

    items = final_bullets or bullets or fallback
    cleaned = []
    covered_terms = set()
    for item in items:
        item = extract_summary_fact(item)
        if is_summary_meta(item):
            continue
        item = re.sub(r"^(?:here(?:'s| is)\s+)?(?:the\s+)?summary\s*[:.-]?\s*", "", item, flags=re.I)
        words = item.split()
        if not words:
            continue

        relevant_text = re.sub(
            r"^(?:explicit\s+)?(?:request|decision|deadline|next action)\s*:\s*",
            "",
            item,
            flags=re.I,
        )
        terms = set(re.findall(r"[a-zA-Z]{3,}", relevant_text.lower()))
        terms.difference_update({
            "and", "after", "are", "but", "for", "from", "has", "have",
            "also", "please", "that", "the", "there", "this", "with", "you",
        })
        if terms and terms.issubset(covered_terms):
            continue

        cleaned.append(f"• {' '.join(words[:40])}")
        covered_terms.update(terms)

    return "\n".join(cleaned[:3])


def normalize_replies(content: str) -> str:
    candidate = re.sub(r"^\s*```(?:json)?\s*|\s*```\s*$", "", content.strip(), flags=re.I)
    try:
        replies = json.loads(candidate)
        if isinstance(replies, list):
            valid = [item.strip() for item in replies if isinstance(item, str) and item.strip()]
            if len(valid) >= 3:
                return "\n\n".join(f"R{index}:\n{reply}" for index, reply in enumerate(valid[:3], 1))
    except json.JSONDecodeError:
        pass
    return content


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now = datetime.now(timezone.utc)
    timestamps = REQUEST_LOG[client_ip]
    while timestamps and timestamps[0] <= now - RATE_WINDOW:
        timestamps.popleft()
    if len(timestamps) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again shortly.")
    timestamps.append(now)

    body = (req.email_context or {}).get("body", "")
    body_limit = 8000 if req.intent == "reply" else 16000 if req.intent == "summarize" else 24000
    if len(body) > body_limit:
        req.email_context = {**(req.email_context or {}), "body": body[:body_limit]}
    if req.intent == "summarize" and not has_summarizable_content(
        (req.email_context or {}).get("body", "")
    ):
        return ChatResponse(
            intent=req.intent,
            response="No email body is available to summarize.",
            actions=[],
        )

    if not LLM_API_KEY:
        raise HTTPException(status_code=500, detail="No API key configured. Set ZEN_API_KEY or DEEPSEEK_API_KEY in .env")

    system_content = build_prompt(
        req.intent, req.email_context, req.preferences, req.prompt
    )

    # Built-in prompts already embed the email context. Sending it again doubles
    # the model input and noticeably delays responses for long messages.
    user_extra = (
        req.prompt or (req.email_context or {}).get("body", "")
        if req.intent not in SYSTEM_PROMPTS
        else ""
    )
    full_content = f"{system_content}\n\n{user_extra}".strip() if user_extra else system_content
    messages = [{"role": "user", "content": full_content}]
    if req.history and req.intent != "summarize":
        for msg in req.history[-6:]:
            messages.append(msg)

    reply_tokens = 4096 if "deepseek" in LLM_MODEL else 900
    max_tokens = {
        "summarize": 640,
        # Zen's DeepSeek Flash model commonly uses 3K+ hidden reasoning tokens
        # before emitting a reply, so lower limits produce an empty response.
        "reply": reply_tokens,
        "priority": 400,
        "tasks": 900,
        "draft": 1400,
    }.get(req.intent, 1000)
    request_payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": 0.2 if req.intent in ("summarize", "priority", "tasks") else 0.6,
        "max_tokens": max_tokens,
    }

    async def request_llm(client: httpx.AsyncClient, payload: dict) -> httpx.Response:
        last_error: httpx.HTTPError | None = None
        for attempt in range(2):
            try:
                return await client.post(
                    LLM_API_URL,
                    headers={
                        "Authorization": f"Bearer {LLM_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
            except httpx.HTTPError as error:
                last_error = error
                if attempt == 0:
                    await asyncio.sleep(1)
        raise last_error or httpx.RequestError("Unknown LLM connection error")

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
            resp = await request_llm(client, request_payload)
            if resp.status_code == 200 and req.intent == "summarize":
                data = resp.json()
                choices = data.get("choices", [])
                msg = choices[0].get("message", {}) if choices else {}
                if not msg.get("content"):
                    # A longer retry lets the model finish its final answer.
                    resp = await request_llm(client, {**request_payload, "max_tokens": 2048})
            if resp.status_code == 200 and req.intent == "reply":
                data = resp.json()
                choices = data.get("choices", [])
                msg = choices[0].get("message", {}) if choices else {}
                if not msg.get("content"):
                    # Some providers spend the first response budget on reasoning.
                    resp = await request_llm(client, {**request_payload, "max_tokens": max(1600, reply_tokens)})
    except httpx.HTTPError as error:
        detail = str(error) or error.__class__.__name__
        raise HTTPException(status_code=502, detail=f"Unable to reach the LLM provider: {detail}") from error

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"LLM API error: {resp.status_code}",
        )

    try:
        data = resp.json()
    except ValueError as error:
        raise HTTPException(status_code=502, detail="LLM provider returned an invalid response.") from error
    choices = data.get("choices", [])
    msg = choices[0].get("message", {}) if choices else {}
    content = msg.get("content") or ""
    if not content:
        raise HTTPException(status_code=502, detail="LLM provider returned an empty response. Please try again.")
    if req.intent == "summarize":
        if not content:
            raise HTTPException(
                status_code=502,
                detail="LLM did not return a final summary. Please try again.",
            )
        content = clean_summary(content)
    elif req.intent == "reply":
        content = normalize_replies(content)

    return ChatResponse(
        intent=req.intent,
        response=content,
        actions=[] if req.intent == "summarize" else [
            {"label": "Copy", "action": "copy"},
            {"label": "Regenerate", "action": "regenerate"},
        ],
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
