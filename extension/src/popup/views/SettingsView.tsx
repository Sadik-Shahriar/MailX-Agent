import React from "react";
import { Stack, Section } from "../../ui/components/Layout";
import { AccountSummary } from "../../ui/features/auth/AccountSummary";
import { SettingsForm } from "../../ui/features/settings/SettingsForm";

export interface SettingsViewProps {
  userEmail: string;
  onSignOut: () => void;
}

export function SettingsView({ userEmail, onSignOut }: SettingsViewProps) {
  return (
    <div style={{ padding: 16 }}>
      <Stack gap={3}>
        <Section>
          <h2 style={{ fontSize: 13, margin: "0 0 12px 0", color: "var(--mx-text)" }}>Account</h2>
          <AccountSummary email={userEmail} onSignOut={onSignOut} />
        </Section>
        
        <SettingsForm />
      </Stack>
    </div>
  );
}
