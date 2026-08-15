import React, { useState, useEffect, useContext } from "react";
import { Stack, Section } from "../../components/Layout";
import { Button } from "../../components/Button";
import { SelectField, NumberField, CheckboxField, TextareaField, TextField } from "../../components/Fields";
import { InlineAlert, ToastContext } from "../../components/Feedback";
import { sendMessage } from "../../runtime/sendMessage";
import type { ModelStatusResponse, UserPreferences } from "../../../shared/types";

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
  const [modelChecking, setModelChecking] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [modelCheckError, setModelCheckError] = useState("");

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

  async function checkQuota() {
    setModelChecking(true);
    setModelCheckError("");
    setModelStatus(null);
    try {
      const selectedModel = prefs.ai_model || "llama-3.1-8b-instant";
      const status: ModelStatusResponse = await sendMessage({
        type: "CHECK_MODEL_STATUS",
        model: selectedModel,
      });
      setModelStatus(status);
    } catch (err: any) {
      setModelCheckError(err.message || "Failed to check model quota.");
    } finally {
      setModelChecking(false);
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

  const [activeCategory, setActiveCategory] = useState<"ai" | "rules" | "writing" | "reminders" | "safety" | "appearance" | null>(null);

  function formatModelLabel(modelId?: string): string {
    switch (modelId) {
      case "llama-3.1-8b-instant":
        return "Llama 3.1 8B (Groq Free)";
      case "llama-3.3-70b-versatile":
        return "Llama 3.3 70B (Groq Free)";
      case "hy3-free":
        return "HY3 (Free)";
      case "deepseek-v4-flash-free":
        return "DeepSeek v4 Flash (Free)";
      case "nemotron-3-ultra-free":
        return "Nemotron 3 Ultra (Free)";
      case "nemotron-3.5-lightning-free":
        return "Nemotron 3.5 Lightning (Free)";
      case "mimo-v2.5-free":
        return "MiMo v2.5 (Free)";
      case "deepseek-v4-flash":
        return "DeepSeek v4 Flash (Paid API)";
      default:
        return modelId || "Llama 3.1 8B (Free)";
    }
  }

  const categories = [
    {
      id: "ai" as const,
      label: "AI Engine & Models",
      icon: "⚡",
      subtitle: `Model: ${formatModelLabel(prefs.ai_model)} • ${prefs.thinking_mode ? "Thinking ON" : "Fast mode"}`,
    },
    {
      id: "rules" as const,
      label: "Custom AI Rules & Priorities",
      icon: "🎯",
      subtitle: "Custom priority patterns, style & summary guidelines",
    },
    {
      id: "writing" as const,
      label: "Writing & Summary Output",
      icon: "✍️",
      subtitle: `Tone: ${prefs.reply_tone || "professional"} • Length: ${prefs.summary_length || "medium"}`,
    },
    {
      id: "reminders" as const,
      label: "Follow-Up Reminders",
      icon: "⏰",
      subtitle: `${prefs.reminder_delay_days || 3} days delay • Email due alerts`,
    },
    {
      id: "safety" as const,
      label: "Advanced Security & Safety",
      icon: "🛡️",
      subtitle: `Phishing (${prefs.phishing_sensitivity || "default"}), Spam safe & blocked senders`,
    },
    {
      id: "appearance" as const,
      label: "Appearance & Theme",
      icon: "🎨",
      subtitle: `Theme: ${localTheme === "system" ? "System Default" : localTheme === "dark" ? "Dark" : "Light"}`,
    },
  ];

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--mx-text-secondary)" }}>Loading settings...</div>;
  }

  const currentCategory = categories.find((c) => c.id === activeCategory);

  return (
    <form onSubmit={handleSave}>
      <Stack gap={3}>
        {loadError && <InlineAlert variant="error" title="Could not load settings" action={<Button variant="secondary" type="button" onClick={loadSettings}>Retry</Button>}>{loadError}</InlineAlert>}
        {validationError && <InlineAlert variant="error" title="Check your lists">{validationError}</InlineAlert>}

        {/* Android-Style Category Master List */}
        <div style={{ display: activeCategory === null ? "flex" : "none", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: "var(--mx-type-xs)", color: "var(--mx-text-secondary)", margin: "0 0 4px 0", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
            Preferences & Categories
          </p>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: "var(--mx-surface-raised)",
                border: "1px solid var(--mx-divider)",
                borderRadius: "var(--mx-radius-md)",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "all var(--mx-duration-fast) var(--mx-ease-out)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  borderRadius: "var(--mx-radius-md)",
                  background: "var(--mx-surface-subtle)",
                  fontSize: 16,
                  flexShrink: 0,
                }}>
                  {cat.icon}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: "var(--mx-type-sm)", fontWeight: 600, color: "var(--mx-text)" }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize: "var(--mx-type-xs)", color: "var(--mx-text-secondary)", lineHeight: 1.3 }}>
                    {cat.subtitle}
                  </span>
                </div>
              </div>
              <div style={{ color: "var(--mx-text-tertiary)", fontSize: 18, marginLeft: 8, fontWeight: 300 }}>
                ›
              </div>
            </button>
          ))}
        </div>

        {/* Category Detail Navigation Header */}
        {activeCategory !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 4 }}>
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "transparent",
                border: "none",
                color: "var(--mx-primary)",
                fontSize: "var(--mx-type-sm)",
                fontWeight: 600,
                cursor: "pointer",
                padding: "4px 0",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span>Settings</span>
            </button>
            <span style={{ color: "var(--mx-text-tertiary)", fontSize: 12 }}>/</span>
            <span style={{ fontSize: "var(--mx-type-sm)", fontWeight: 600, color: "var(--mx-text)" }}>
              {currentCategory?.label}
            </span>
          </div>
        )}

        {/* Category 1: AI Engine & Models */}
        <div style={{ display: activeCategory === "ai" ? "block" : "none" }}>
          <Section>
            <h2 style={{ fontSize: 13, margin: "0 0 12px 0", color: "var(--mx-text)" }}>AI Engine & Models</h2>
            <SelectField
              label="Active AI Model"
              value={prefs.ai_model || "llama-3.1-8b-instant"}
              onChange={(e) => {
                updatePref("ai_model", e.target.value);
                setModelStatus(null);
                setModelCheckError("");
              }}
            >
              <optgroup label="Free Tier (Groq Cloud API - Fast LPU)">
                <option value="llama-3.1-8b-instant">⚡ Llama 3.1 8B Instant (Recommended Default - Fast & Free)</option>
                <option value="llama-3.3-70b-versatile">Meta Llama 3.3 70B Versatile (Free - Groq)</option>
              </optgroup>
              <optgroup label="Free Tier (OpenCode Zen API)">
                <option value="hy3-free">HY3 (Free - Zen)</option>
                <option value="deepseek-v4-flash-free">DeepSeek v4 Flash (Free - Zen)</option>
                <option value="nemotron-3-ultra-free">NVIDIA Nemotron 3 Ultra (Free)</option>
                <option value="nemotron-3.5-lightning-free">NVIDIA Nemotron 3.5 Lightning (Free)</option>
                <option value="mimo-v2.5-free">MiMo v2.5 (Free)</option>
              </optgroup>
              <optgroup label="DeepSeek Direct API (Paid)">
                <option value="deepseek-v4-flash">DeepSeek v4 Flash (Paid API - Fast Non-Thinking)</option>
              </optgroup>
            </SelectField>

            {prefs.ai_model === "deepseek-v4-flash" && (
              <div style={{
                marginTop: 8,
                padding: "8px 12px",
                borderRadius: "var(--mx-radius-sm)",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                fontSize: 12,
                color: "var(--mx-text-secondary)",
                lineHeight: 1.4,
              }}>
                <strong style={{ color: "var(--mx-text)" }}>💳 Paid Model Active:</strong> This model calls DeepSeek API directly using your <code>DEEPSEEK_API_KEY</code> in fast non-thinking mode. It is only used when explicitly selected here.
              </div>
            )}

            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--mx-text-secondary)" }}>Check Quota / Availability</span>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={checkQuota}
                  isLoading={modelChecking}
                >
                  Check Quota Status
                </Button>
              </div>

              {modelStatus && (
                <InlineAlert
                  variant={modelStatus.status === "available" ? "success" : modelStatus.status === "rate_limited" ? "error" : "warning"}
                  title={modelStatus.status === "available" ? "Quota Available" : modelStatus.status === "rate_limited" ? "Limit Exceeded" : "Model Status"}
                >
                  {modelStatus.message}
                </InlineAlert>
              )}
              {modelCheckError && (
                <InlineAlert variant="error" title="Check Failed">
                  {modelCheckError}
                </InlineAlert>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <CheckboxField
                label="Enable AI Thinking Mode"
                checked={prefs.thinking_mode ?? false}
                onChange={(e) => updatePref("thinking_mode", e.target.checked)}
              />
              <p style={{ margin: "4px 0 0 24px", fontSize: 12, color: "var(--mx-text-secondary)", lineHeight: 1.4 }}>
                When disabled (recommended), models run in fast non-thinking mode. When enabled, models with reasoning support will perform deeper multi-step reasoning.
              </p>
            </div>
          </Section>
        </div>

        {/* Category 2: Custom AI Rules & Priorities */}
        <div style={{ display: activeCategory === "rules" ? "block" : "none" }}>
          <Section>
            <h2 style={{ fontSize: 13, margin: "0 0 12px 0", color: "var(--mx-text)" }}>🎯 Custom AI Instructions & Priority Rules</h2>
            <p style={{ fontSize: 12, color: "var(--mx-text-secondary)", margin: "0 0 12px 0", lineHeight: 1.4 }}>
              Personalize how MailX analyzes priorities, drafts replies, summarizes threads, and generates emails.
            </p>

            <TextareaField
              label="Custom Priority Rules"
              helperText="Define criteria, senders, or keywords that MailX should automatically flag as High Priority."
              placeholder="e.g. Flag emails containing invoices over $500, messages from thesis advisor, or server alerts as High Priority"
              value={prefs.custom_priority_rules || ""}
              onChange={(e) => updatePref("custom_priority_rules", e.target.value)}
              rows={2}
            />

            <TextareaField
              label="Custom Reply Style & Sign-off"
              helperText="Special guidelines for suggested replies (signature, sign-off phrase, length)."
              placeholder="e.g. Always sign off with 'Best, Sadik', keep replies direct and under 2 sentences"
              value={prefs.custom_reply_instructions || ""}
              onChange={(e) => updatePref("custom_reply_instructions", e.target.value)}
              rows={2}
            />

            <TextareaField
              label="Custom Summary Focus"
              helperText="Guide what details MailX should prioritize in executive summaries."
              placeholder="e.g. Emphasize dollar amounts, deadlines, and direct action items"
              value={prefs.custom_summary_instructions || ""}
              onChange={(e) => updatePref("custom_summary_instructions", e.target.value)}
              rows={2}
            />

            <TextareaField
              label="Custom Draft Guidelines"
              helperText="Style instructions when generating full email drafts from scratch."
              placeholder="e.g. Include structured bullet points for deliverables and maintain a collaborative tone"
              value={prefs.custom_draft_instructions || ""}
              onChange={(e) => updatePref("custom_draft_instructions", e.target.value)}
              rows={2}
            />

            <TextareaField
              label="Custom Task Extraction Rules"
              helperText="Personalize how MailX identifies tasks, default assignees, or priority filters."
              placeholder="e.g. Always assign tasks to 'Sadik' if unspecified; prioritize deliverables with hard dates"
              value={prefs.custom_task_instructions || ""}
              onChange={(e) => updatePref("custom_task_instructions", e.target.value)}
              rows={2}
            />
          </Section>
        </div>

        {/* Category 3: Writing & AI Output */}
        <div style={{ display: activeCategory === "writing" ? "block" : "none" }}>
          <Section>
            <h2 style={{ fontSize: 13, margin: "0 0 12px 0", color: "var(--mx-text)" }}>✍️ Writing & AI Output</h2>
            <SelectField
              label="Reply Tone"
              value={prefs.reply_tone || "professional"}
              onChange={(e) => updatePref("reply_tone", e.target.value)}
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
            </SelectField>

            <div style={{ marginTop: 12 }}>
              <TextField
                label="Your Name (for Sign-Offs)"
                helperText="Auto-detected from Google account. Used for closing signature (e.g. 'Best regards, Alice')."
                placeholder="e.g. Alice"
                value={prefs.user_name || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePref("user_name", e.target.value)}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <SelectField
                label="Summary Length"
                value={prefs.summary_length || "medium"}
                onChange={(e) => updatePref("summary_length", e.target.value)}
              >
                <option value="short">Short (1–2 concise points)</option>
                <option value="medium">Medium (3 balanced points — Default)</option>
                <option value="long">Detailed (4–5 comprehensive points)</option>
              </SelectField>
            </div>
          </Section>
        </div>

        {/* Category 4: Reminders */}
        <div style={{ display: activeCategory === "reminders" ? "block" : "none" }}>
          <Section>
            <h2 style={{ fontSize: 13, margin: "0 0 12px 0", color: "var(--mx-text)" }}>⏰ Reminders</h2>
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
        </div>

        {/* Category 5: Advanced Safety & Security */}
        <div style={{ display: activeCategory === "safety" ? "block" : "none" }}>
          <Section>
            <h2 style={{ fontSize: 13, margin: "0 0 12px 0", color: "var(--mx-text)" }}>🛡️ Advanced Safety & Security</h2>
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
        </div>

        {/* Category 6: Appearance */}
        <div style={{ display: activeCategory === "appearance" ? "block" : "none" }}>
          <Section>
            <h2 style={{ fontSize: 13, margin: "0 0 12px 0", color: "var(--mx-text)" }}>🎨 Appearance</h2>
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
        </div>

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
