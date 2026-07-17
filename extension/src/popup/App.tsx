import React, { useState, useEffect, useRef } from "react";
import { createStatsRequestGuard } from "./statsRequestGuard";
import type { Task } from "../shared/types";

type Tab = "inbox" | "tasks" | "stats" | "followups" | "settings";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("inbox");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [statsError, setStatsError] = useState("");
  const [period, setPeriod] = useState<7 | 30 | 90>(7);
  const statsRequests = useRef(createStatsRequestGuard());
  const [reminders, setReminders] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState("");
  const [preferences, setPreferences] = useState({
    reply_tone: "professional",
    reminder_delay_days: 3,
    reminder_notify_before: true,
    reminder_notify_due: true,
    reminder_notify_overdue: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    setLoading(true);
    try {
      chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
        if (res?.loggedIn) {
          setIsLoggedIn(true);
          setUserEmail(res.email || "");
        }
        setLoading(false);
      });
    } catch {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    setAuthError("");
    chrome.runtime.sendMessage({ type: "SIGN_IN" }, (res) => {
      if (res?.loggedIn) {
        setIsLoggedIn(true);
        setUserEmail(res.email);
      } else if (res?.error) {
        setAuthError(res.error);
      }
    });
  }

  const showDevLogin = import.meta.env.DEV;

  async function handleDevSignIn() {
    setAuthError("");
    chrome.runtime.sendMessage({ type: "DEV_SIGN_IN" }, (res) => {
      if (res?.loggedIn) {
        setIsLoggedIn(true);
        setUserEmail(res.email);
      } else if (res?.error) {
        setAuthError(res.error);
      }
    });
  }

  async function handleSignOut() {
    chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
      setIsLoggedIn(false);
      setUserEmail("");
    });
  }

  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab === "stats") loadStats();
    if (activeTab === "tasks") loadTasks();
    if (activeTab === "followups") loadReminders();
    if (activeTab === "settings") chrome.runtime.sendMessage({ type: "GET_PREFERENCES" }, (data) => data && setPreferences(data));
  }, [activeTab, isLoggedIn, period]);

  function loadStats() {
    const request = statsRequests.current.start();
    setStats(null);
    setStatsError("");
    chrome.runtime.sendMessage({ type: "GET_STATS", period, refresh: true }, (data) => {
      if (!statsRequests.current.isCurrent(request)) return;
      if (data?.error) setStatsError(data.error);
      else setStats(data);
    });
  }

  function loadReminders() {
    chrome.runtime.sendMessage({ type: "GET_REMINDERS" }, (data) => setReminders(data?.reminders || []));
  }

  function loadTasks() {
    setTasksLoading(true);
    setTasksError("");
    chrome.runtime.sendMessage({ type: "GET_TASKS", period }, (data) => {
      setTasksLoading(false);
      if (chrome.runtime.lastError || data?.error) {
        setTasksError(chrome.runtime.lastError?.message || data?.error || "Could not load tasks.");
        return;
      }
      setTasks(Array.isArray(data?.tasks) ? data.tasks : []);
    });
  }

  function toggleTask(id: string) {
    chrome.runtime.sendMessage({ type: "TOGGLE_TASK", task_id: id, period }, (data) => {
      if (chrome.runtime.lastError || data?.error) {
        setTasksError(chrome.runtime.lastError?.message || data?.error || "Could not update task.");
        return;
      }
      if (Array.isArray(data?.tasks)) setTasks(data.tasks);
    });
  }

  function deleteCompletedTask(id: string) {
    chrome.runtime.sendMessage({ type: "DELETE_TASK", task_id: id, period }, (data) => {
      if (chrome.runtime.lastError || data?.error) {
        setTasksError(chrome.runtime.lastError?.message || data?.error || "Could not delete task.");
        return;
      }
      if (Array.isArray(data?.tasks)) setTasks(data.tasks);
    });
  }

  function deleteAllCompletedTasks() {
    if (!window.confirm("Delete all completed tasks? Their completion history will remain in Statistics.")) return;
    chrome.runtime.sendMessage({ type: "DELETE_COMPLETED_TASKS", period }, (data) => {
      if (chrome.runtime.lastError || data?.error) {
        setTasksError(chrome.runtime.lastError?.message || data?.error || "Could not delete completed tasks.");
        return;
      }
      if (Array.isArray(data?.tasks)) setTasks(data.tasks);
    });
  }

  function dismissReminder(id: string) {
    chrome.runtime.sendMessage({ type: "DISMISS_REMINDER", reminder_id: id }, loadReminders);
  }

  function saveCurrentPreferences() {
    chrome.runtime.sendMessage({ type: "SAVE_PREFERENCES", preferences });
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>
        Loading...
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>MailX</h1>
        <p style={{ color: "#6b7280", marginBottom: 4, fontSize: 13 }}>
          AI-powered Gmail assistant
        </p>
        <p style={{ color: "#9ca3af", marginBottom: 16, fontSize: 12 }}>
          Summarize &bull; Reply &bull; Draft &bull; Prioritize &bull; Tasks
        </p>
        {authError && (
          <p style={{ color: "#dc2626", marginBottom: 12, fontSize: 12 }}>
            {authError}
          </p>
        )}
        <button
          onClick={handleSignIn}
          style={{
            padding: "10px 24px",
            background: "#1f2937",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
            display: "block",
            margin: "0 auto 8px",
          }}
        >
          Sign in with Google
        </button>
        {showDevLogin && <button
          onClick={handleDevSignIn}
          style={{
            border: "1px dashed #9ca3af",
            background: "transparent",
            padding: "6px 16px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          Dev Login (bypass OAuth)
        </button>}
      </div>
    );
  }

  return (
    <div>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div style={{ padding: 16, fontSize: 13 }}>
        {activeTab === "inbox" && (
          <div>
            <p style={{ color: "#6b7280", marginBottom: 12 }}>
              Signed in as <strong>{userEmail}</strong>
            </p>
            <p style={{ color: "#374151", marginBottom: 8 }}>
              Open an email in Gmail and use the MailX toolbar buttons:
            </p>
            <ul style={{ paddingLeft: 20, color: "#6b7280", lineHeight: 1.8 }}>
              <li><strong>Summarize</strong> &mdash; AI summary of the email</li>
              <li><strong>Reply</strong> &mdash; Smart reply suggestions</li>
              <li><strong>Draft</strong> &mdash; AI-generated draft reply</li>
              <li><strong>Priority</strong> &mdash; Detect priority level</li>
              <li><strong>Tasks</strong> &mdash; Extract tasks & deadlines</li>
            </ul>
          </div>
        )}
        {activeTab === "tasks" && (
          <TasksView tasks={tasks} period={period} loading={tasksLoading} error={tasksError} onPeriodChange={setPeriod} onToggle={toggleTask} onDelete={deleteCompletedTask} onDeleteAll={deleteAllCompletedTasks} />
        )}
        {activeTab === "stats" && (
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[7, 30, 90].map((days) => <button key={days} onClick={() => setPeriod(days as 7 | 30 | 90)} style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 4, padding: 5, background: period === days ? "#1f2937" : "white", color: period === days ? "white" : "#374151" }}>Last {days}d</button>)}
            </div>
            {statsError && <p style={{ color: "#dc2626", fontSize: 12 }}>{statsError}</p>}
            {!stats && !statsError && <p style={{ color: "#9ca3af" }}>Loading statistics...</p>}
            {stats && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Score label="Emails sent" value={stats.sent} />
              <Score label="Emails received" value={stats.received} />
              <Score label="Tasks completed" value={stats.completedTasks} />
              <Score label="Tasks pending" value={stats.pendingTasks} />
            </div>}
          </div>
        )}
        {activeTab === "followups" && (
          <div>
            {!reminders.length && <p style={{ color: "#9ca3af" }}>No follow-ups need attention.</p>}
            {reminders.map((reminder) => <div key={reminder.id} style={{ borderBottom: "1px solid #e5e7eb", padding: "8px 0" }}>
              <strong style={{ display: "block" }}>{reminder.subject}</strong>
              <span style={{ color: "#6b7280", fontSize: 11 }}>{reminder.type.replaceAll("_", " ")}</span>
              <button onClick={() => dismissReminder(reminder.id)} style={{ float: "right", border: 0, background: "transparent", color: "#1a73e8", cursor: "pointer" }}>Dismiss</button>
            </div>)}
          </div>
        )}
        {activeTab === "settings" && (
          <div>
            <label style={{ display: "block", marginBottom: 12 }}>Reply tone<br /><select value={preferences.reply_tone} onChange={(event) => setPreferences({ ...preferences, reply_tone: event.target.value })}><option value="professional">Professional</option><option value="formal">Formal</option><option value="casual">Casual</option></select></label>
            <label style={{ display: "block", marginBottom: 12 }}>Remind after days<br /><input type="number" min="1" max="30" value={preferences.reminder_delay_days} onChange={(event) => setPreferences({ ...preferences, reminder_delay_days: Number(event.target.value) })} /></label>
            <label style={{ display: "block", marginBottom: 8 }}><input type="checkbox" checked={preferences.reminder_notify_before} onChange={(event) => setPreferences({ ...preferences, reminder_notify_before: event.target.checked })} /> Notify one day before a task is due</label>
            <label style={{ display: "block", marginBottom: 8 }}><input type="checkbox" checked={preferences.reminder_notify_due} onChange={(event) => setPreferences({ ...preferences, reminder_notify_due: event.target.checked })} /> Notify when a task is due</label>
            <label style={{ display: "block", marginBottom: 12 }}><input type="checkbox" checked={preferences.reminder_notify_overdue} onChange={(event) => setPreferences({ ...preferences, reminder_notify_overdue: event.target.checked })} /> Notify when a task is overdue</label>
            <button onClick={saveCurrentPreferences} style={{ padding: "6px 12px", border: 0, borderRadius: 4, background: "#1a73e8", color: "white", cursor: "pointer" }}>Save settings</button>
          </div>
        )}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            onClick={handleSignOut}
            style={{
              border: "1px solid #d1d5db",
              background: "white",
              padding: "6px 16px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function TabBar({ activeTab, onTabChange }: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "inbox", label: "Inbox" },
    { id: "tasks", label: "Tasks" },
    { id: "stats", label: "Stats" },
    { id: "followups", label: "Follow-Ups" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            padding: "10px 0",
            border: "none",
            background: activeTab === tab.id ? "#f3f4f6" : "transparent",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: activeTab === tab.id ? 600 : 400,
            color: activeTab === tab.id ? "#1f2937" : "#6b7280",
            borderBottom: activeTab === tab.id ? "2px solid #1f2937" : "2px solid transparent",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function TasksView({
  tasks,
  period,
  loading,
  error,
  onPeriodChange,
  onToggle,
  onDelete,
  onDeleteAll,
}: {
  tasks: Task[];
  period: 7 | 30 | 90;
  loading: boolean;
  error: string;
  onPeriodChange: (period: 7 | 30 | 90) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}) {
  const visibleTasks = tasks.filter((task) => task.status === "pending" || task.status === "completed");
  const pending = visibleTasks.filter((task) => task.status === "pending");
  const completed = visibleTasks.filter((task) => task.status === "completed");

  if (loading) return <p style={{ color: "#9ca3af" }}>Loading tasks...</p>;
  if (error) return <p style={{ color: "#dc2626", fontSize: 12 }}>{error}</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {[7, 30, 90].map((days) => <button key={days} onClick={() => onPeriodChange(days as 7 | 30 | 90)} style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 4, padding: 5, background: period === days ? "#1f2937" : "white", color: period === days ? "white" : "#374151" }}>{days}d</button>)}
      </div>
      {!visibleTasks.length && <p style={{ color: "#9ca3af" }}>No tasks in the last {period} days.</p>}
      <TaskSection title={`To do (${pending.length})`} tasks={pending} onToggle={onToggle} />
      <TaskSection title={`Completed (${completed.length})`} tasks={completed} onToggle={onToggle} onDelete={onDelete} onDeleteAll={onDeleteAll} />
    </div>
  );
}

function TaskSection({
  title,
  tasks,
  onToggle,
  onDelete,
  onDeleteAll,
}: {
  title: string;
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  onDeleteAll?: () => void;
}) {
  return (
    <section style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h2 style={{ fontSize: 13, margin: 0, color: "#374151" }}>{title}</h2>
        {onDeleteAll && tasks.length > 0 && <button type="button" onClick={onDeleteAll} style={{ border: "1px solid #fecaca", borderRadius: 4, padding: "3px 7px", background: "#fff7f7", color: "#b91c1c", cursor: "pointer", fontSize: 11 }}>Delete all</button>}
      </div>
      {!tasks.length && <p style={{ color: "#9ca3af", fontSize: 12 }}>None</p>}
      {tasks.map((task) => (
        <label key={task.id} style={{ display: "block", padding: "9px 0", borderBottom: "1px solid #e5e7eb", cursor: "pointer" }}>
          <input type="checkbox" checked={task.status === "completed"} onChange={() => onToggle(task.id)} />
          <span style={{ marginLeft: 8, textDecoration: task.status === "completed" ? "line-through" : "none" }}>{task.description}</span>
          <small style={{ display: "block", margin: "4px 0 0 24px", color: "#6b7280" }}>
            {task.due_date ? `Due ${task.due_date}` : "No due date"} · {task.priority} priority
          </small>
          {task.status === "completed" && onDelete && <button type="button" onClick={(event) => { event.preventDefault(); onDelete(task.id); }} style={{ margin: "6px 0 0 24px", border: "1px solid #fecaca", borderRadius: 4, padding: "3px 7px", background: "#fff7f7", color: "#b91c1c", cursor: "pointer", fontSize: 11 }}>Delete</button>}
        </label>
      ))}
    </section>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return <div style={{ background: "#f3f4f6", borderRadius: 6, padding: 10 }}><strong style={{ display: "block", fontSize: 19 }}>{value}</strong><span style={{ color: "#6b7280", fontSize: 11 }}>{label}</span></div>;
}
