import React, { useState, useEffect, useContext } from "react";
import { Stack, Section } from "../../components/Layout";
import { Button } from "../../components/Button";
import { SelectField, NumberField, CheckboxField, TextareaField } from "../../components/Fields";
import { InlineAlert, ToastContext } from "../../components/Feedback";
import { sendMessage } from "../../runtime/sendMessage";
import type { UserPreferences } from "../../../shared/types";

export function SettingsForm() {
  const toastContext = useContext(ToastContext);
  const showToast = toastContext?.showToast || (() => {});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Partial<UserPreferences>>({});
  const [originalPrefs, setOriginalPrefs] = useState<Partial<UserPreferences>>({});
  const [localTheme, setLocalTheme] = useState<"system" | "light" | "dark">("system");
  const [originalLocalTheme, setOriginalLocalTheme] = useState<"system" | "light" | "dark">("system");
  const [loadError, setLoadError] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await sendMessage({ type: "GET_PREFERENCES" });
      if (data) {
        setPrefs(data);
        setOriginalPrefs(data);
      }
      const storage = await chrome.storage.local.get("mailx_theme");
      const theme = storage.mailx_theme || "system";
      setLocalTheme(theme);
      setOriginalLocalTheme(theme);
    } catch (err: any) {
      setLoadError(err.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }

  const isChanged = 
    JSON.stringify(prefs) !== JSON.stringify(originalPrefs) || 
    localTheme !== originalLocalTheme;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isChanged) return;

    const listError = validateLists(prefs);
    if (listError) {
      setValidationError(listError);
      return;
    }
    
    setValidationError("");
    setSaving(true);
    try {
      if (localTheme !== originalLocalTheme) {
        await chrome.storage.local.set({ mailx_theme: localTheme });
        setOriginalLocalTheme(localTheme);
      }
      
      if (JSON.stringify(prefs) !== JSON.stringify(originalPrefs)) {
        await sendMessage({ type: "SAVE_PREFERENCES", preferences: prefs });
        setOriginalPrefs(prefs);
      }
      
      showToast("Settings saved", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  const updatePref = (key: keyof UserPreferences, value: any) => {
    setPrefs(p => ({ ...p, [key]: value }));
  };

  const updateList = (key: "spam_whitelist" | "spam_blacklist" | "phishing_allowlist", value: string) => {
    updatePref(key, toList(value));
  };

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--mx-text-secondary)" }}>Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSave}>
      <Stack gap={3}>
        {loadError && <InlineAlert variant="error" title="Could not load settings" action={<Button variant="secondary" type="button" onClick={loadSettings}>Retry</Button>}>{loadError}</InlineAlert>}
        {validationError && <InlineAlert variant="error" title="Check your lists">{validationError}</InlineAlert>}
        <Section>
          <h2 style={{ fontSize: 13, margin: "0 0 12px 0", color: "var(--mx-text)" }}>Appearance</h2>
          <SelectField
            label="Theme"
            value={localTheme}
            onChange={(e) => setLocalTheme(e.target.value as any)}
          >
            <option value="system">System Default</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </SelectField>
        </Section>

        <Section>
          <h2 style={{ fontSize: 13, margin: "0 0 12px 0", color: "var(--mx-text)" }}>Writing</h2>
          <SelectField
            label="Reply Tone"
            value={prefs.reply_tone || "professional"}
            onChange={(e) => updatePref("reply_tone", e.target.value)}
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="formal">Formal</option>
          </SelectField>
        </Section>

        <Section>
          <h2 style={{ fontSize: 13, margin: "0 0 12px 0", color: "var(--mx-text)" }}>Reminders</h2>
          <NumberField
            label="Follow-up Delay (Days)"
            value={prefs.reminder_delay_days || 3}
            onChange={(e) => updatePref("reminder_delay_days", parseInt(e.target.value, 10))}
            min={1}
            max={30}
          />
          <div style={{ marginTop: 12 }}>
            <CheckboxField
              label="Notify Before Due"
              checked={prefs.reminder_notify_before ?? true}
              onChange={(e) => updatePref("reminder_notify_before", e.target.checked)}
            />
            <CheckboxField
              label="Notify on Due Date"
              checked={prefs.reminder_notify_due ?? true}
              onChange={(e) => updatePref("reminder_notify_due", e.target.checked)}
            />
            <CheckboxField
              label="Notify Overdue"
              checked={prefs.reminder_notify_overdue ?? false}
              onChange={(e) => updatePref("reminder_notify_overdue", e.target.checked)}
            />
          </div>
        </Section>

        <Section>
          <h2 style={{ fontSize: 13, margin: "0 0 12px 0", color: "var(--mx-text)" }}>Advanced Safety</h2>
          <SelectField
            label="Phishing Sensitivity"
            value={prefs.phishing_sensitivity || "default"}
            onChange={(e) => updatePref("phishing_sensitivity", e.target.value)}
          >
            <option value="low">Low (Fewer warnings)</option>
            <option value="default">Default</option>
            <option value="high">High (More warnings)</option>
          </SelectField>
          <TextareaField
            label="Safe senders"
            helperText="One email address or domain per line. These senders are never flagged as spam."
            value={(prefs.spam_whitelist || []).join("\n")}
            onChange={(e) => updateList("spam_whitelist", e.target.value)}
            rows={3}
          />
          <TextareaField
            label="Blocked senders"
            helperText="One email address or domain per line. These senders are always marked as spam."
            value={(prefs.spam_blacklist || []).join("\n")}
            onChange={(e) => updateList("spam_blacklist", e.target.value)}
            rows={3}
          />
          <TextareaField
            label="Trusted phishing domains"
            helperText="One hostname per line, such as example.com. URLs and paths are not accepted."
            value={(prefs.phishing_allowlist || []).join("\n")}
            onChange={(e) => updateList("phishing_allowlist", e.target.value)}
            rows={3}
          />
        </Section>

        <Button
          type="submit"
          variant="primary"
          disabled={!isChanged || saving}
          isLoading={saving}
          style={{ alignSelf: "flex-start", width: "100%" }}
        >
          Save Changes
        </Button>
      </Stack>
    </form>
  );
}

function toList(value: string): string[] {
  return [...new Set(value.split(/[\n,]/).map((item) => item.trim().toLowerCase()).filter(Boolean))];
}

function validateLists(prefs: Partial<UserPreferences>): string {
  const delay = prefs.reminder_delay_days;
  if (delay !== undefined && (!Number.isInteger(delay) || delay < 1 || delay > 30)) {
    return "Follow-up delay must be a whole number between 1 and 30 days.";
  }
  const senderPattern = /^(?:[^\s@]+@[^\s@]+\.[^\s@]+|[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)$/i;
  const hostnamePattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
  const invalidSender = [...(prefs.spam_whitelist || []), ...(prefs.spam_blacklist || [])].find((value) => !senderPattern.test(value));
  if (invalidSender) return `"${invalidSender}" is not a valid email address or domain.`;
  const invalidHostname = (prefs.phishing_allowlist || []).find((value) => !hostnamePattern.test(value));
  if (invalidHostname) return `"${invalidHostname}" must be a hostname without a protocol or path.`;
  return "";
}
