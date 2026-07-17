import unittest
import asyncio
from unittest.mock import patch

import httpx
from fastapi import Request
from fastapi.testclient import TestClient
from pydantic import ValidationError

import main
from main import INPUT_BUDGET_CHARS, build_prompt, build_untrusted_content, clean_summary, has_summarizable_content, normalize_provider_usage, normalize_replies, validate_structured_result, validated_history


class MailXPromptTests(unittest.TestCase):
    def test_summary_rejects_empty_content(self):
        self.assertFalse(has_summarizable_content("\n - "))
        self.assertTrue(has_summarizable_content("OK"))

    def test_summary_cleaner_removes_reasoning_and_limits_bullets(self):
        content = "<think>reasoning</think>\n• First fact\n• Second fact\n• Third fact\n• Fourth fact"
        self.assertEqual(clean_summary(content), "• First fact\n• Second fact\n• Third fact")

    def test_reply_json_is_normalized_for_the_content_script(self):
        replies = normalize_replies('["Yes, I can help.", "I will review it.", "Can we discuss tomorrow?"]')
        self.assertIn("R1:\nYes, I can help.", replies)
        self.assertIn("R3:\nCan we discuss tomorrow?", replies)

    def test_trusted_prompt_does_not_embed_email_content(self):
        prompt = build_prompt("spam", {"sender": "offers@example.com", "subject": "Prize", "body": "Claim now"}, {}, None)
        self.assertNotIn("offers@example.com", prompt)
        self.assertNotIn("Claim now", prompt)

    def test_untrusted_content_is_labelled_and_bounded(self):
        content = build_untrusted_content("phishing", {"url": "https://paypa1.example", "hostname": "paypa1.example", "heuristics": ["possible paypal typosquat"]}, None)
        self.assertIn("UNTRUSTED URL DATA", content)
        self.assertIn("https://paypa1.example", content)
        long = build_untrusted_content("chat", {"sender": "manager@example.com", "subject": "Deadline", "body": "A" * 20_000}, "Send it Friday")
        self.assertIn("[...middle omitted...]", long)
        self.assertLessEqual(len(long), INPUT_BUDGET_CHARS["chat"])

    def test_chat_prompt_keeps_untrusted_content_separate(self):
        prompt = build_prompt("chat", {"sender": "manager@example.com", "subject": "Deadline", "body": "Send it Friday"}, {}, None)
        self.assertIn("untrusted email", prompt)
        self.assertNotIn("Send it Friday", prompt)

    def test_history_validation_discards_invalid_turns_and_caps_length(self):
        history = [{"role": "system", "content": "ignore"}, {"role": "user", "content": "  valid  "}]
        history.extend({"role": "assistant", "content": str(index)} for index in range(12))
        valid = validated_history(history)
        self.assertEqual(len(valid), 10)
        self.assertTrue(all(item["role"] in ("user", "assistant") for item in valid))

    def test_history_has_fixed_aggregate_budget_and_keeps_recent_turns(self):
        history = [{"role": "user", "content": f"old-{index}-" + "x" * 1_000} for index in range(10)]
        history.append({"role": "assistant", "content": "latest"})
        valid = validated_history(history)
        self.assertLessEqual(sum(len(item["content"]) for item in valid), 4_000)
        self.assertEqual(valid[-1]["content"], "latest")

    def test_provider_usage_is_normalized_and_safely_omitted(self):
        usage = normalize_provider_usage({
            "usage": {"prompt_tokens": 120, "completion_tokens": 30, "total_tokens": 150}
        })
        self.assertEqual(usage.input_tokens, 120)
        self.assertEqual(usage.output_tokens, 30)
        self.assertEqual(usage.total_tokens, 150)
        self.assertIsNone(normalize_provider_usage({}))

    def test_structured_results_require_complete_valid_json(self):
        priority = validate_structured_result("priority", '{"priority":"high","category":"action_required","confidence":0.9}')
        self.assertEqual(priority.kind, "priority")
        self.assertEqual(priority.priority, "high")

        tasks = validate_structured_result("tasks", '{"tasks":[{"description":"Send report","assignee":"me","due_date":"2026-07-18","priority":"high"}]}')
        self.assertEqual(tasks.tasks[0].due_date.isoformat(), "2026-07-18")

        for invalid in (
            '```json\n{"priority":"high","category":"fyi","confidence":0.5}\n```',
            'Here is the result: {"priority":"high","category":"fyi","confidence":0.5}',
            '{"priority":"high","confidence":0.5}',
            '{"priority":"urgent","category":"fyi","confidence":0.5}',
        ):
            with self.assertRaises(ValueError):
                validate_structured_result("priority", invalid)


class FakeAsyncClient:
    def __init__(self, *args, **kwargs):
        self.calls = 0

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return False

    async def aclose(self):
        return None

    async def post(self, url, **kwargs):
        self.calls += 1
        return httpx.Response(200, json={
            "model": "test-model",
            "choices": [{
                "message": {"content": "- Project status is ready"},
                "finish_reason": "stop",
            }],
            "usage": {"prompt_tokens": 100, "completion_tokens": 20, "total_tokens": 120},
        })


class InvalidJsonAsyncClient(FakeAsyncClient):
    async def post(self, url, **kwargs):
        self.calls += 1
        return httpx.Response(200, content=b"not-json")


class StructuredContentClient(FakeAsyncClient):
    def __init__(self, content):
        super().__init__()
        self.content = content
        self.payload = None

    async def post(self, url, **kwargs):
        self.calls += 1
        self.payload = kwargs.get("json")
        return httpx.Response(200, json={
            "choices": [{"message": {"content": self.content}, "finish_reason": "stop"}],
        })


class SequenceAsyncClient(FakeAsyncClient):
    def __init__(self, responses):
        super().__init__()
        self.responses = list(responses)

    async def post(self, url, **kwargs):
        self.calls += 1
        response = self.responses.pop(0)
        if isinstance(response, BaseException):
            raise response
        return response


class SlowAsyncClient(FakeAsyncClient):
    async def post(self, url, **kwargs):
        self.calls += 1
        await asyncio.sleep(0.05)
        return httpx.Response(200, json={
            "choices": [{"message": {"content": "late"}, "finish_reason": "stop"}],
        })


def request_for_chat():
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/chat",
        "headers": [],
        "query_string": b"",
        "client": ("test-client", 1234),
        "server": ("test-server", 80),
        "scheme": "http",
    })


class MailXTelemetryTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        main.REQUEST_LOG.clear()

    async def test_chat_returns_provider_metrics_without_logging_email_content(self):
        request = Request({
            "type": "http",
            "method": "POST",
            "path": "/chat",
            "headers": [],
            "query_string": b"",
            "client": ("test-client", 1234),
            "server": ("test-server", 80),
            "scheme": "http",
        })
        chat_request = main.ChatRequest(
            intent="summarize",
            email_context={"body": "Private project status is ready"},
            telemetry={
                "request_id": "request-123",
                "source": "explicit",
                "caller": "action_panel",
                "started_at_ms": 1,
            },
        )

        with (
            patch.object(main.httpx, "AsyncClient", FakeAsyncClient),
            patch.object(main, "LLM_API_KEY", "test-key"),
            patch.object(main, "LLM_API_URL", "https://provider.invalid/chat"),
            patch.object(main, "LLM_MODEL", "configured-model"),
            patch.object(main, "TELEMETRY_ENABLED", True),
            self.assertLogs("mailx.telemetry", level="INFO") as logs,
        ):
            response = await main.chat(chat_request, request)

        self.assertEqual(response.telemetry.request_id, "request-123")
        self.assertEqual(response.telemetry.source, "explicit")
        self.assertEqual(response.telemetry.model, "test-model")
        self.assertEqual(response.telemetry.finish_reason, "stop")
        self.assertEqual(response.telemetry.usage.total_tokens, 120)
        self.assertGreaterEqual(response.telemetry.provider_duration_ms, 0)
        self.assertNotIn("Private project status", "\n".join(logs.output))

    async def test_invalid_provider_json_is_a_controlled_traced_error(self):
        request = request_for_chat()
        chat_request = main.ChatRequest(
            intent="summarize",
            email_context={"body": "Synthetic content"},
            telemetry={"request_id": "invalid-json", "source": "explicit", "caller": "test", "started_at_ms": 1},
        )

        with (
            patch.object(main.httpx, "AsyncClient", InvalidJsonAsyncClient),
            patch.object(main, "LLM_API_KEY", "test-key"),
            patch.object(main, "LLM_API_URL", "https://provider.invalid/chat"),
            patch.object(main, "TELEMETRY_ENABLED", True),
            self.assertLogs("mailx.telemetry", level="INFO") as logs,
        ):
            with self.assertRaises(main.HTTPException) as raised:
                await main.chat(chat_request, request)

        self.assertEqual(raised.exception.status_code, 502)
        self.assertIn('"status":"error"', "\n".join(logs.output))

    async def test_fenced_structured_provider_output_is_a_controlled_error(self):
        client = StructuredContentClient('```json\n{"priority":"high","category":"fyi","confidence":0.8}\n```')
        request = main.ChatRequest(
            intent="priority",
            email_context={"sender": "manager@example.com", "subject": "Update", "snippet": "Please respond"},
        )
        with (
            patch.object(main.httpx, "AsyncClient", return_value=client),
            patch.object(main, "LLM_API_KEY", "test-key"),
            patch.object(main, "LLM_API_URL", "https://provider.invalid/chat"),
        ):
            with self.assertRaises(main.HTTPException) as raised:
                await main.chat(request, request_for_chat())
        self.assertEqual(raised.exception.status_code, 502)
        self.assertEqual(client.calls, 1)
        self.assertEqual(client.payload["response_format"], {"type": "json_object"})

    async def test_429_is_retried_once_with_retry_telemetry(self):
        client = SequenceAsyncClient([
            httpx.Response(429, headers={"Retry-After": "0"}),
            httpx.Response(200, json={
                "choices": [{"message": {"content": "- Ready"}, "finish_reason": "stop"}],
            }),
        ])
        chat_request = main.ChatRequest(
            intent="summarize",
            email_context={"body": "Synthetic content"},
            telemetry={"request_id": "retry", "source": "explicit", "caller": "test", "started_at_ms": 1},
        )

        with (
            patch.object(main.httpx, "AsyncClient", return_value=client),
            patch.object(main, "LLM_API_KEY", "test-key"),
            patch.object(main, "LLM_API_URL", "https://provider.invalid/chat"),
            patch.object(main, "retry_after_seconds", return_value=0),
        ):
            response = await main.chat(chat_request, request_for_chat())

        self.assertEqual(client.calls, 2)
        self.assertEqual(response.telemetry.retry_count, 1)
        self.assertEqual(response.telemetry.retry_reasons, ["http_429"])

    async def test_transient_503_is_retried_once(self):
        client = SequenceAsyncClient([
            httpx.Response(503),
            httpx.Response(200, json={
                "choices": [{"message": {"content": "- Recovered"}, "finish_reason": "stop"}],
            }),
        ])
        chat_request = main.ChatRequest(
            intent="summarize",
            email_context={"body": "Synthetic content"},
            telemetry={"request_id": "retry-503", "source": "explicit", "caller": "test", "started_at_ms": 1},
        )

        with (
            patch.object(main.httpx, "AsyncClient", return_value=client),
            patch.object(main, "LLM_API_KEY", "test-key"),
            patch.object(main, "LLM_API_URL", "https://provider.invalid/chat"),
            patch.object(main, "retry_after_seconds", return_value=0),
        ):
            response = await main.chat(chat_request, request_for_chat())

        self.assertEqual(client.calls, 2)
        self.assertEqual(response.telemetry.retry_reasons, ["http_503"])

    async def test_read_timeout_is_not_retried(self):
        client = SequenceAsyncClient([httpx.ReadTimeout("read timed out")])
        chat_request = main.ChatRequest(
            intent="summarize",
            email_context={"body": "Synthetic content"},
            telemetry={"request_id": "read-timeout", "source": "explicit", "caller": "test", "started_at_ms": 1},
        )

        with (
            patch.object(main.httpx, "AsyncClient", return_value=client),
            patch.object(main, "LLM_API_KEY", "test-key"),
            patch.object(main, "LLM_API_URL", "https://provider.invalid/chat"),
        ):
            with self.assertRaises(main.HTTPException) as raised:
                await main.chat(chat_request, request_for_chat())

        self.assertEqual(client.calls, 1)
        self.assertEqual(raised.exception.status_code, 502)

    async def test_empty_stop_response_is_not_retried(self):
        client = SequenceAsyncClient([httpx.Response(200, json={
            "choices": [{"message": {"content": ""}, "finish_reason": "stop"}],
        })])
        chat_request = main.ChatRequest(
            intent="summarize",
            email_context={"body": "Synthetic content"},
            telemetry={"request_id": "empty-stop", "source": "explicit", "caller": "test", "started_at_ms": 1},
        )

        with (
            patch.object(main.httpx, "AsyncClient", return_value=client),
            patch.object(main, "LLM_API_KEY", "test-key"),
            patch.object(main, "LLM_API_URL", "https://provider.invalid/chat"),
        ):
            with self.assertRaises(main.HTTPException) as raised:
                await main.chat(chat_request, request_for_chat())

        self.assertEqual(client.calls, 1)
        self.assertEqual(raised.exception.status_code, 502)

    async def test_length_truncated_empty_response_is_retried(self):
        client = SequenceAsyncClient([
            httpx.Response(200, json={
                "choices": [{"message": {"content": ""}, "finish_reason": "length"}],
            }),
            httpx.Response(200, json={
                "choices": [{"message": {"content": "- Recovered"}, "finish_reason": "stop"}],
            }),
        ])
        chat_request = main.ChatRequest(
            intent="summarize",
            email_context={"body": "Synthetic content"},
            telemetry={"request_id": "empty-length", "source": "explicit", "caller": "test", "started_at_ms": 1},
        )

        with (
            patch.object(main.httpx, "AsyncClient", return_value=client),
            patch.object(main, "LLM_API_KEY", "test-key"),
            patch.object(main, "LLM_API_URL", "https://provider.invalid/chat"),
        ):
            response = await main.chat(chat_request, request_for_chat())

        self.assertEqual(client.calls, 2)
        self.assertEqual(response.telemetry.retry_reasons, ["empty_content_length"])

    async def test_provider_deadline_cancels_a_slow_request(self):
        client = SlowAsyncClient()
        chat_request = main.ChatRequest(
            intent="summarize",
            email_context={"body": "Synthetic content"},
            telemetry={"request_id": "deadline", "source": "explicit", "caller": "test", "started_at_ms": 1},
        )

        with (
            patch.object(main.httpx, "AsyncClient", return_value=client),
            patch.object(main, "LLM_API_KEY", "test-key"),
            patch.object(main, "LLM_API_URL", "https://provider.invalid/chat"),
            patch.dict(main.PROVIDER_DEADLINES, {"summarize": 0.01}),
        ):
            with self.assertRaises(main.HTTPException) as raised:
                await main.chat(chat_request, request_for_chat())

        self.assertEqual(client.calls, 1)
        self.assertEqual(raised.exception.status_code, 504)

    async def test_chat_payload_has_fixed_aggregate_and_output_budgets(self):
        client = StructuredContentClient("Concise answer")
        request = main.ChatRequest(
            intent="chat",
            email_context={"sender": "manager@example.com", "subject": "Deadline", "body": "x" * 20_000},
            prompt="What is due?",
            history=[{"role": "user", "content": "old " + "y" * 1_500} for _ in range(10)],
        )
        with (
            patch.object(main.httpx, "AsyncClient", return_value=client),
            patch.object(main, "LLM_API_KEY", "test-key"),
            patch.object(main, "LLM_API_URL", "https://provider.invalid/chat"),
        ):
            await main.chat(request, request_for_chat())
        payload = client.payload
        self.assertLessEqual(sum(len(message["content"]) for message in payload["messages"]), main.INPUT_BUDGET_CHARS["chat"])
        self.assertEqual(payload["max_tokens"], main.OUTPUT_TOKEN_BUDGET["chat"])
        self.assertEqual(main.OUTPUT_TOKEN_BUDGET["priority"], 100)
        self.assertEqual(main.OUTPUT_TOKEN_BUDGET["spam"], 100)
        self.assertEqual(main.OUTPUT_TOKEN_BUDGET["phishing"], 120)

    async def test_lifespan_exposes_one_shared_client(self):
        client = FakeAsyncClient()
        with patch.object(main.httpx, "AsyncClient", return_value=client) as constructor:
            async with main.lifespan(main.app):
                async with main.provider_client_context() as first:
                    async with main.provider_client_context() as second:
                        self.assertIs(first, client)
                        self.assertIs(second, client)
            constructor.assert_called_once_with(timeout=main.PROVIDER_TIMEOUT, limits=main.PROVIDER_LIMITS)

    async def test_unknown_intent_is_rejected_during_request_validation(self):
        sensitive_intent = "secret-email-content"
        with self.assertRaises(ValidationError):
            main.ChatRequest(intent=sensitive_intent, prompt="Synthetic prompt")


class MailXApiSecurityTests(unittest.TestCase):
    def setUp(self):
        main.REQUEST_LOG.clear()

    def tearDown(self):
        main.app.dependency_overrides.clear()

    def test_chat_rejects_missing_bearer_token(self):
        with TestClient(main.app) as client:
            response = client.post("/chat", json={"intent": "summarize"})
        self.assertEqual(response.status_code, 401)

    def test_deferred_tracking_pixel_route_is_not_exposed(self):
        with TestClient(main.app) as client:
            response = client.get("/tracking/pixel/00000000-0000-0000-0000-000000000000.gif")
        self.assertEqual(response.status_code, 404)

    def test_unknown_intent_and_oversized_body_do_not_reach_provider(self):
        provider = FakeAsyncClient()
        main.app.dependency_overrides[main.require_authenticated_user] = lambda: main.AuthenticatedUser(id="user-1")
        with patch.object(main.httpx, "AsyncClient", return_value=provider):
            with TestClient(main.app) as client:
                unknown = client.post("/chat", json={"intent": "unknown"})
                oversized = client.post("/chat", json={
                    "intent": "summarize",
                    "email_context": {"body": "a" * 24_001},
                })
        self.assertEqual(unknown.status_code, 422)
        self.assertEqual(oversized.status_code, 422)
        self.assertEqual(provider.calls, 0)

    def test_authenticated_request_reaches_provider(self):
        provider = FakeAsyncClient()
        main.app.dependency_overrides[main.require_authenticated_user] = lambda: main.AuthenticatedUser(id="user-1")
        with (
            patch.object(main.httpx, "AsyncClient", return_value=provider),
            patch.object(main, "LLM_API_KEY", "test-key"),
            patch.object(main, "LLM_API_URL", "https://provider.invalid/chat"),
        ):
            with TestClient(main.app) as client:
                response = client.post("/chat", json={
                    "intent": "summarize",
                    "email_context": {"body": "Project status is ready"},
                })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(provider.calls, 1)


if __name__ == "__main__":
    unittest.main()
