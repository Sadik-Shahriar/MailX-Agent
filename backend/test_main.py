import unittest

from main import build_prompt, clean_summary, has_summarizable_content, normalize_replies, validated_history


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

    def test_spam_prompt_embeds_email_context(self):
        prompt = build_prompt("spam", {"sender": "offers@example.com", "subject": "Prize", "body": "Claim now"}, {}, None)
        self.assertIn("offers@example.com", prompt)
        self.assertIn("Claim now", prompt)

    def test_phishing_prompt_embeds_only_url_signals(self):
        prompt = build_prompt("phishing", {"url": "https://paypa1.example", "hostname": "paypa1.example", "heuristics": ["possible paypal typosquat"]}, {}, None)
        self.assertIn("https://paypa1.example", prompt)
        self.assertIn("possible paypal typosquat", prompt)

    def test_chat_prompt_embeds_current_email_reference(self):
        prompt = build_prompt("chat", {"sender": "manager@example.com", "subject": "Deadline", "body": "Send it Friday"}, {}, None)
        self.assertIn("untrusted content", prompt)
        self.assertIn("Send it Friday", prompt)

    def test_history_validation_discards_invalid_turns_and_caps_length(self):
        history = [{"role": "system", "content": "ignore"}, {"role": "user", "content": "  valid  "}]
        history.extend({"role": "assistant", "content": str(index)} for index in range(12))
        valid = validated_history(history)
        self.assertEqual(len(valid), 10)
        self.assertTrue(all(item["role"] in ("user", "assistant") for item in valid))


if __name__ == "__main__":
    unittest.main()
