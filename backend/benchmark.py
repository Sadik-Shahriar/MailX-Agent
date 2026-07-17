"""Run a privacy-safe MailX provider baseline with synthetic email content."""

import asyncio
import json
import time
import uuid

from fastapi import HTTPException, Request

import main


SYNTHETIC_CONTEXT = {
    "id": "benchmark-email",
    "sender": "colleague@example.test",
    "subject": "Synthetic project update",
    "body": (
        "This is synthetic benchmark data. The project review is Friday at 10:00 AM. "
        "Please send the draft agenda by Thursday and confirm attendance."
    ),
}

SCENARIOS = (
    ("summarize", None),
    ("reply", None),
    ("tasks", None),
    ("draft", "Write a concise follow-up confirming the review."),
    ("chat", "When is the review and what should I send first?"),
)


def request_scope() -> Request:
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/chat",
        "headers": [],
        "query_string": b"",
        "client": ("benchmark", 1),
        "server": ("localhost", 8001),
        "scheme": "http",
    })


async def run() -> None:
    if not main.LLM_API_KEY:
        raise SystemExit("No LLM provider key is configured.")

    main.REQUEST_LOG.clear()
    for intent, prompt in SCENARIOS:
        request_id = f"benchmark-{uuid.uuid4()}"
        request = main.ChatRequest(
            intent=intent,
            email_context=SYNTHETIC_CONTEXT,
            prompt=prompt,
            history=[] if intent == "chat" else None,
            telemetry={
                "request_id": request_id,
                "source": "explicit",
                "caller": "benchmark",
                "started_at_ms": time.time() * 1000,
            },
        )
        started = time.perf_counter()
        try:
            response = await main.chat(request, request_scope())
            result = response.telemetry.model_dump(exclude_none=True)
            result.update({
                "event": "baseline_result",
                "status": "success",
                "benchmark_total_ms": round((time.perf_counter() - started) * 1000, 2),
            })
        except HTTPException as error:
            result = {
                "event": "baseline_result",
                "request_id": request_id,
                "intent": intent,
                "status": "error",
                "http_status": error.status_code,
                "benchmark_total_ms": round((time.perf_counter() - started) * 1000, 2),
            }
        print(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    asyncio.run(run())
