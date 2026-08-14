import React, { useEffect, useState, useMemo } from "react";
import { Button } from "../../ui/components/Button";
import { sendMessage } from "../../ui/runtime/sendMessage";
import type { Task } from "../../shared/types";

export interface HomeViewProps {
  userEmail: string;
  onFindPanel: () => void;
  onNavigateTab?: (tab: "inbox" | "tasks" | "stats" | "settings") => void;
}

export function HomeView({ userEmail, onFindPanel, onNavigateTab }: HomeViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const username = useMemo(() => {
    if (!userEmail) return "there";
    const part = userEmail.split("@")[0];
    return part.charAt(0).toUpperCase() + part.slice(1);
  }, [userEmail]);

  useEffect(() => {
    let mounted = true;
    async function loadDashboardData() {
      try {
        const [tasksRes, remindersRes] = await Promise.all([
          sendMessage({ type: "GET_TASKS", period: 30 }).catch(() => ({ tasks: [] })),
          sendMessage({ type: "GET_REMINDERS" }).catch(() => ({ reminders: [] }))
        ]);
        if (mounted) {
          if (Array.isArray(tasksRes?.tasks)) {
            setTasks(tasksRes.tasks);
          }
          if (Array.isArray(remindersRes?.reminders)) {
            setReminders(remindersRes.reminders);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDashboardData();
    return () => { mounted = false; };
  }, []);

  const pendingTasks = useMemo(() => {
    return tasks.filter(t => t.status === "pending");
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter(t => t.status === "completed");
  }, [tasks]);

  // Urgent task: highest priority pending task or nearest due
  const urgentTask = useMemo(() => {
    if (!pendingTasks.length) return null;
    const high = pendingTasks.find(t => t.priority === "high");
    if (high) return high;
    const withDue = pendingTasks.filter(t => Boolean(t.due_date));
    if (withDue.length) return withDue[0];
    return pendingTasks[0];
  }, [pendingTasks]);

  const handleToggleTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      const res = await sendMessage({ type: "TOGGLE_TASK", task_id: taskId, period: 30 });
      if (Array.isArray(res?.tasks)) {
        setTasks(res.tasks);
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: t.status === "completed" ? "pending" : "completed" } : t));
      }
    } catch {
      // Fallback
    } finally {
      setCompletingTaskId(null);
    }
  };

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
      
      {/* 1. Header with Greeting & Online Badge */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        background: "var(--mx-surface-raised)",
        borderRadius: "var(--mx-radius-md)",
        border: "1px solid var(--mx-divider)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: "var(--mx-radius-pill)",
            background: "linear-gradient(135deg, var(--mx-primary) 0%, #3B82F6 100%)",
            color: "var(--mx-on-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "14px",
            flexShrink: 0
          }}>
            {username.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--mx-text)", lineHeight: 1.2 }}>
              {greeting}, {username}
            </span>
            <span style={{
              fontSize: "11px",
              color: "var(--mx-text-secondary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 180
            }}>
              {userEmail}
            </span>
          </div>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "var(--mx-success-soft)",
          padding: "3px 8px",
          borderRadius: "var(--mx-radius-pill)",
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--mx-success)",
          flexShrink: 0
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--mx-success)", display: "inline-block" }} />
          AI Active
        </div>
      </div>

      {/* 2. Primary Launch Action */}
      <Button variant="primary" isFullWidth onClick={onFindPanel} style={{
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontSize: "14px",
        fontWeight: 600,
        boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)"
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        Open MailX in Gmail
      </Button>

      {/* 3. Smart Glance KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        
        {/* Pending Tasks Card */}
        <div
          onClick={() => onNavigateTab?.("tasks")}
          style={{
            background: "var(--mx-surface-raised)",
            border: "1px solid var(--mx-divider)",
            borderRadius: "var(--mx-radius-md)",
            padding: "10px 8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            cursor: onNavigateTab ? "pointer" : "default",
            transition: "transform 0.15s ease, border-color 0.15s ease",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--mx-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Tasks</span>
          <span style={{ fontSize: "20px", fontWeight: 800, color: pendingTasks.length > 0 ? "var(--mx-primary)" : "var(--mx-text)", margin: "2px 0" }}>
            {loading ? "..." : pendingTasks.length}
          </span>
          <span style={{ fontSize: "10px", color: "var(--mx-text-tertiary)" }}>
            {pendingTasks.length === 1 ? "1 Pending" : `${pendingTasks.length} Pending`}
          </span>
        </div>

        {/* Reminders Card */}
        <div
          onClick={() => onNavigateTab?.("tasks")}
          style={{
            background: "var(--mx-surface-raised)",
            border: "1px solid var(--mx-divider)",
            borderRadius: "var(--mx-radius-md)",
            padding: "10px 8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            cursor: onNavigateTab ? "pointer" : "default",
            transition: "transform 0.15s ease, border-color 0.15s ease",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--mx-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Reminders</span>
          <span style={{ fontSize: "20px", fontWeight: 800, color: reminders.length > 0 ? "var(--mx-warning)" : "var(--mx-text)", margin: "2px 0" }}>
            {loading ? "..." : reminders.length}
          </span>
          <span style={{ fontSize: "10px", color: "var(--mx-text-tertiary)" }}>
            {reminders.length === 1 ? "1 Follow-up" : `${reminders.length} Follow-ups`}
          </span>
        </div>

        {/* Completed Stats Card */}
        <div
          onClick={() => onNavigateTab?.("stats")}
          style={{
            background: "var(--mx-surface-raised)",
            border: "1px solid var(--mx-divider)",
            borderRadius: "var(--mx-radius-md)",
            padding: "10px 8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            cursor: onNavigateTab ? "pointer" : "default",
            transition: "transform 0.15s ease, border-color 0.15s ease",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--mx-text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>Done</span>
          <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--mx-success)", margin: "2px 0" }}>
            {loading ? "..." : completedTasks.length}
          </span>
          <span style={{ fontSize: "10px", color: "var(--mx-text-tertiary)" }}>
            Completed
          </span>
        </div>

      </div>

      {/* 4. Actionable Feed / Up Next Task */}
      <div style={{
        background: "var(--mx-surface-raised)",
        border: "1px solid var(--mx-divider)",
        borderRadius: "var(--mx-radius-md)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--mx-text-secondary)", letterSpacing: "0.03em", textTransform: "uppercase" }}>
              Action Item
            </span>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab("tasks")}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "12px",
                color: "var(--mx-primary)",
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 4px"
              }}
            >
              View all &rarr;
            </button>
          )}
        </div>

        {urgentTask ? (
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "8px 10px",
            background: "var(--mx-surface-subtle)",
            borderRadius: "var(--mx-radius-sm)",
            border: "1px solid var(--mx-divider)"
          }}>
            <input
              type="checkbox"
              checked={urgentTask.status === "completed"}
              disabled={completingTaskId === urgentTask.id}
              onChange={() => handleToggleTask(urgentTask.id)}
              style={{
                marginTop: 3,
                cursor: "pointer",
                accentColor: "var(--mx-primary)",
                width: 16,
                height: 16
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--mx-text)", lineHeight: 1.3 }}>
                {urgentTask.description}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: "11px", color: "var(--mx-text-secondary)" }}>
                {urgentTask.due_date && <span>📅 Due {urgentTask.due_date}</span>}
                <span style={{
                  padding: "1px 6px",
                  borderRadius: "var(--mx-radius-pill)",
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  background: urgentTask.priority === "high" ? "var(--mx-danger-soft)" : "var(--mx-warning-soft)",
                  color: urgentTask.priority === "high" ? "var(--mx-danger)" : "var(--mx-warning)"
                }}>
                  {urgentTask.priority}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            background: "var(--mx-surface-subtle)",
            borderRadius: "var(--mx-radius-sm)",
            fontSize: "12px",
            color: "var(--mx-text-secondary)"
          }}>
            <span>✨</span>
            <span>All caught up! No pending tasks for this week.</span>
          </div>
        )}
      </div>

      {/* 5. AI Capabilities Launchpad */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--mx-text-secondary)", letterSpacing: "0.03em", textTransform: "uppercase" }}>
          AI Features in Gmail
        </span>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          
          <div style={{
            padding: "10px 12px",
            background: "var(--mx-surface-raised)",
            border: "1px solid var(--mx-divider)",
            borderRadius: "var(--mx-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "14px" }}>📋</span>
              <strong style={{ fontSize: "12px", color: "var(--mx-text)" }}>Summarize</strong>
            </div>
            <span style={{ fontSize: "11px", color: "var(--mx-text-secondary)", lineHeight: 1.3 }}>
              3-bullet takeaway of long email threads.
            </span>
          </div>

          <div style={{
            padding: "10px 12px",
            background: "var(--mx-surface-raised)",
            border: "1px solid var(--mx-divider)",
            borderRadius: "var(--mx-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "14px" }}>💬</span>
              <strong style={{ fontSize: "12px", color: "var(--mx-text)" }}>Smart Reply</strong>
            </div>
            <span style={{ fontSize: "11px", color: "var(--mx-text-secondary)", lineHeight: 1.3 }}>
              1-click tailored contextual responses.
            </span>
          </div>

          <div style={{
            padding: "10px 12px",
            background: "var(--mx-surface-raised)",
            border: "1px solid var(--mx-divider)",
            borderRadius: "var(--mx-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "14px" }}>✍️</span>
              <strong style={{ fontSize: "12px", color: "var(--mx-text)" }}>Draft Writer</strong>
            </div>
            <span style={{ fontSize: "11px", color: "var(--mx-text-secondary)", lineHeight: 1.3 }}>
              AI drafts complete emails in your tone.
            </span>
          </div>

          <div style={{
            padding: "10px 12px",
            background: "var(--mx-surface-raised)",
            border: "1px solid var(--mx-divider)",
            borderRadius: "var(--mx-radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "14px" }}>🛡️</span>
              <strong style={{ fontSize: "12px", color: "var(--mx-text)" }}>Security</strong>
            </div>
            <span style={{ fontSize: "11px", color: "var(--mx-text-secondary)", lineHeight: 1.3 }}>
              Phishing link and spam safety advisor.
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
