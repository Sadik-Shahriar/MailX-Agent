# MailX Performance Baseline

Date: 2026-07-17

## Safety And Scope

This baseline uses only the synthetic email fixture in `backend/benchmark.py`. It does not send a real email, sender, subject, prompt, model response, credential, or URL to telemetry logs. The benchmark output contains request IDs, intent, model, durations, character counts, provider usage, finish reason, retry metadata, and status.

The initial run measures backend and provider behavior. It is one sample per intent, not a statistically meaningful P50/P95. UI click-to-result, queue, cache, and task-persistence measurements are emitted by the development extension and should be collected with the repeatable UI procedure below before and after queue/cache optimizations.

## Environment

| Field | Value |
|---|---|
| Provider model | `mimo-v2.5-free` |
| Request source | Explicit synthetic benchmark |
| Final instrumented runs per intent | 1 |
| Email data | Synthetic `.test` fixture |
| Cache | Bypassed by direct backend benchmark |

## Initial Results

| Intent | Provider ms | Backend ms | Total ms | Input chars | Input tokens | Output tokens | Total tokens | Finish | Retries | Retry reason |
|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---|
| Summary | 9,971.97 | 10,930.68 | 10,930.84 | 247 | 299 | 196 | 495 | `stop` | 0 | - |
| Reply | 10,734.65 | 11,502.75 | 11,502.84 | 1,133 | 481 | 243 | 724 | `stop` | 0 | - |
| Tasks | 8,873.25 | 9,577.46 | 9,577.54 | 481 | 367 | 266 | 633 | `stop` | 0 | - |
| Draft | 23,046.74 | 23,765.63 | 23,765.72 | 735 | 419 | 1,241 | 1,660 | `stop` | 0 | - |
| Chat | 10,420.78 | 11,127.04 | 11,127.15 | 673 | 152 | 455 | 607 | `stop` | 0 | - |

Draft consumed 1,241 output tokens for a short synthetic request. A preliminary instrumentation run also observed Tasks taking 53,583.24 ms with two retries, demonstrating substantial provider variance and the need for the deadline/retry work planned in T04 and T06. That preliminary row is excluded from the final table because repeated input-character accounting was corrected before the final run.

## T09 Budgeted Results

One synthetic post-budget run on the same model and fixture produced lower total tokens for every measured intent. This is a directional one-sample comparison, not a P50/P95 result.

| Intent | T02 total tokens | T09 total tokens | Change |
|---|---:|---:|---:|
| Summary | 495 | 146 | -70.5% |
| Reply | 724 | 629 | -13.1% |
| Tasks | 633 | 233 | -63.2% |
| Draft | 1,660 | 194 | -88.3% |
| Chat | 607 | 272 | -55.2% |

The T09 run had zero retries and `stop` finish reasons for all five intents. Input/output budgets are enforced before provider dispatch; long email excerpts retain the beginning and end around an omission marker, while chat retains recent turns within one fixed aggregate budget.

## T18 Final Directional Run

The final synthetic run used the same fixture and model. It is one sample per intent and therefore does not establish P95 latency.

| Intent | Total ms | Provider ms | Total tokens | Token change from T02 | Retries | Finish |
|---|---:|---:|---:|---:|---:|---|
| Summary | 10,055.47 | 8,901.27 | 240 | -51.5% | 0 | `stop` |
| Reply | 12,099.69 | 11,305.50 | 456 | -37.0% | 0 | `stop` |
| Tasks | 6,337.77 | 5,544.13 | 232 | -63.3% | 0 | `stop` |
| Draft | 6,633.76 | 5,737.96 | 194 | -88.3% | 0 | `stop` |
| Chat | 6,172.82 | 5,329.75 | 250 | -58.8% | 0 | `stop` |

All optimized intents remain below their T02 token totals. Summary and Reply did not have a statistically valid P95 sample: provider time accounted for 88.5% and 93.4% of their final total latency respectively, so provider latency is the limiting component. Streaming remains deferred because it would not reduce provider completion time and no measured P95 justifies its added complexity.

## Repeat Backend Baseline

From `backend/` with a development provider key configured:

```powershell
python benchmark.py
```

Run the same revision and model at least 20 times per target intent before using P50/P95 for release decisions. Retain only the JSON metadata lines; never add model response content to benchmark output.

## Repeat UI Scenarios

Use a dedicated synthetic test email and a development extension build. Open the service-worker and Gmail content-script consoles and filter for `[MailX telemetry]`.

1. Summary: open the synthetic email and click `Summarize` once cold, then once with a warm cache.
2. Reply: click `Smart Reply` and wait for the three reply options.
3. Tasks: click `Extract Tasks` and wait until persisted task cards render.
4. Draft: open `Draft`, enter the fixed synthetic instruction, and click `Generate draft`.
5. Chat: open `Ask MailX`, submit the fixed synthetic question, and wait for the answer.

For each action, correlate records by `request_id` and capture:

- `source` and `caller`
- `click_to_result_ms`
- `queue_wait_ms`
- `cache_outcome`
- `cache_persistence_ms` or task `persistence_ms`
- `backend_round_trip_ms`
- backend `provider_duration_ms` and `backend_duration_ms`
- model, input/output/total tokens, finish reason, retry count, and retry reason

Automatic toolbar and inbox actions use `source: automatic`; clicks and composer submissions use `source: explicit`.
