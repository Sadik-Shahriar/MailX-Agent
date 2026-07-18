import React from "react";
import { Stack } from "../../components/Layout";
import { Button } from "../../components/Button";

export interface AccountSummaryProps {
  email: string;
  onSignOut: () => void;
}

export function AccountSummary({ email, onSignOut }: AccountSummaryProps) {
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between", 
      padding: "12px 16px", 
      background: "var(--mx-surface-subtle)", 
      borderRadius: "var(--mx-radius-lg)" 
    }}>
      <Stack gap={1}>
        <span style={{ fontSize: 12, color: "var(--mx-text-secondary)" }}>Signed in as</span>
        <span style={{ fontSize: 13, color: "var(--mx-text)", fontWeight: 500 }}>{email}</span>
      </Stack>
      <Button variant="quiet" onClick={onSignOut}>
        Sign out
      </Button>
    </div>
  );
}
