import React from "react";
import { Stack, Section } from "../../ui/components/Layout";
import { Button } from "../../ui/components/Button";

export interface HomeViewProps {
  userEmail: string;
  onFindPanel: () => void;
}

export function HomeView({ userEmail, onFindPanel }: HomeViewProps) {
  return (
    <div style={{ padding: 16 }}>
      <Stack gap={3}>
        <Section>
          <Stack gap={2}>
            <p style={{ color: "var(--mx-text-secondary)", margin: 0, fontSize: 13 }}>
              Signed in as <strong style={{ color: "var(--mx-text)" }}>{userEmail}</strong>
            </p>
            <p style={{ color: "var(--mx-text)", margin: 0, fontSize: 13 }}>
              Open an email in Gmail and use the MailX toolbar buttons:
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, color: "var(--mx-text-secondary)", lineHeight: 1.8, fontSize: 13 }}>
              <li><strong style={{ color: "var(--mx-text)" }}>Summarize</strong> &mdash; AI summary of the email</li>
              <li><strong style={{ color: "var(--mx-text)" }}>Suggested reply</strong> &mdash; Smart reply suggestions</li>
              <li><strong style={{ color: "var(--mx-text)" }}>Draft</strong> &mdash; AI-generated draft reply</li>
              <li><strong style={{ color: "var(--mx-text)" }}>Priority</strong> &mdash; Detect priority level</li>
              <li><strong style={{ color: "var(--mx-text)" }}>Tasks</strong> &mdash; Extract tasks & deadlines</li>
            </ul>
            <div style={{ marginTop: 8 }}>
              <Button variant="primary" isFullWidth onClick={onFindPanel}>
                Open MailX in Gmail
              </Button>
            </div>
          </Stack>
        </Section>
      </Stack>
    </div>
  );
}
