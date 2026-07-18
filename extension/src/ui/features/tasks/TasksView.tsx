import React, { useEffect, useState } from "react";
import { Stack, Section } from "../../components/Layout";
import { SegmentedControl } from "../../components/SegmentedControl";
import { InlineAlert, Skeleton, Badge, Spinner } from "../../components/Feedback";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { useTasks } from "./useTasks";
import type { Task } from "../../../shared/types";

export function TasksView() {
  const [period, setPeriod] = useState<7 | 30 | 90>(7);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const { 
    tasks, reminders, loading, error, mutatingTasks, deletingCompleted,
    loadData, toggleTask, deleteTask, deleteAllCompletedTasks, dismissReminder 
  } = useTasks();

  useEffect(() => {
    loadData(period);
  }, [period, loadData]);

  const visibleTasks = tasks.filter((t: Task) => t.status === "pending" || t.status === "completed");
  const pending = visibleTasks.filter((t: Task) => t.status === "pending");
  const completed = visibleTasks.filter((t: Task) => t.status === "completed");

  const handleDeleteAll = () => {
    deleteAllCompletedTasks(period);
    setConfirmDelete(false);
  };

  const handleDeleteTask = () => {
    if (taskToDelete) deleteTask(taskToDelete, period);
    setTaskToDelete(null);
  };

  return (
    <div style={{ padding: 16 }}>
      <Stack gap={3}>
        <Section>
          <SegmentedControl
            segments={[
              { id: "7", label: "7 days" },
              { id: "30", label: "30 days" },
              { id: "90", label: "90 days" }
            ]}
            activeSegment={period.toString()}
            onChange={(val: string) => setPeriod(Number(val) as 7 | 30 | 90)}
            ariaLabel="Time range"
          />
        </Section>

        {error && <InlineAlert variant="error" title="Tasks Error" action={<Button variant="secondary" onClick={() => loadData(period)}>Retry</Button>}>{error}</InlineAlert>}
        
        {loading && !tasks.length && !error && (
          <Stack gap={3}>
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </Stack>
        )}

        {!loading && !visibleTasks.length && !reminders.length && !error && (
          <p style={{ color: "var(--mx-text-secondary)", fontSize: 13, textAlign: "center", padding: "32px 0" }}>
            No tasks or follow-ups in the last {period} days.
          </p>
        )}

        {reminders.length > 0 && (
          <ReminderList 
            reminders={reminders} 
            mutatingTasks={mutatingTasks}
            onDismiss={(id) => dismissReminder(id, period)} 
          />
        )}

        {pending.length > 0 && (
          <TaskList 
            title={`To do (${pending.length})`} 
            tasks={pending} 
            mutatingTasks={mutatingTasks}
            onToggle={(id) => toggleTask(id, period)} 
          />
        )}

        {completed.length > 0 && (
          <TaskList 
            title={`Completed (${completed.length})`} 
            tasks={completed} 
            mutatingTasks={mutatingTasks}
            onToggle={(id) => toggleTask(id, period)} 
            onDelete={setTaskToDelete}
            onDeleteAll={() => setConfirmDelete(true)}
          />
        )}
      </Stack>

      <Dialog 
        isOpen={confirmDelete}
        title="Delete all completed tasks?"
        description="Their completion history will remain in Statistics."
        onClose={() => setConfirmDelete(false)}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="quiet" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteAll} isLoading={deletingCompleted}>Delete All</Button>
          </div>
        }
      >
        <p style={{ margin: 0 }}>This action cannot be undone.</p>
      </Dialog>
      <Dialog
        isOpen={taskToDelete !== null}
        title="Delete completed task?"
        description="This removes the task from this list."
        onClose={() => setTaskToDelete(null)}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", width: "100%" }}>
            <Button variant="quiet" onClick={() => setTaskToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteTask}>Delete</Button>
          </div>
        }
      >
        <p style={{ margin: 0 }}>This action cannot be undone.</p>
      </Dialog>
    </div>
  );
}

function humanizeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "No due date";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(`${dateStr}T00:00:00`)
    : new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "No due date";
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 0) return "Overdue";
  
  return `Due ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function humanizeReminderType(type: string): string {
  if (type === "no_reply") return "No reply yet";
  const str = type.replace(/_/g, " ");
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function ReminderList({ reminders, mutatingTasks, onDismiss }: { reminders: any[], mutatingTasks: Set<string>, onDismiss: (id: string) => void }) {
  return (
    <Section>
      <h2 style={{ fontSize: 13, margin: "0 0 8px 0", color: "var(--mx-text)" }}>Follow-ups ({reminders.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, border: "1px solid var(--mx-divider)", borderRadius: "var(--mx-radius-md)", overflow: "hidden" }}>
        {reminders.map((reminder, idx) => {
          const isMutating = mutatingTasks.has(reminder.id);
          return (
          <div key={reminder.id} style={{ 
            padding: 12, 
            background: "var(--mx-surface)",
            borderBottom: idx < reminders.length - 1 ? "1px solid var(--mx-divider)" : "none",
            opacity: isMutating ? 0.6 : 1,
            pointerEvents: isMutating ? "none" : "auto"
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <strong style={{ display: "block", fontSize: 13, color: "var(--mx-text)", marginBottom: 4 }}>
                  {reminder.subject}
                </strong>
                <Badge variant="info">{humanizeReminderType(reminder.type)}</Badge>
              </div>
              {isMutating ? (
                <div style={{ padding: "6px 8px" }}><Spinner /></div>
              ) : (
                <Button variant="quiet" onClick={() => onDismiss(reminder.id)}>Dismiss</Button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </Section>
  );
}

function TaskList({ 
  title, tasks, mutatingTasks, onToggle, onDelete, onDeleteAll 
}: { 
  title: string, tasks: Task[], mutatingTasks: Set<string>, onToggle: (id: string) => void, onDelete?: (id: string) => void, onDeleteAll?: () => void 
}) {
  return (
    <Section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 13, margin: 0, color: "var(--mx-text)" }}>{title}</h2>
        {onDeleteAll && <Button variant="danger" onClick={onDeleteAll}>Delete all</Button>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, border: "1px solid var(--mx-divider)", borderRadius: "var(--mx-radius-md)", overflow: "hidden" }}>
        {tasks.map((task, idx) => {
          const isCompleted = task.status === "completed";
          const id = "task-" + task.id;
          const isMutating = mutatingTasks.has(task.id);
          return (
            <div key={task.id} style={{ 
              padding: "12px", 
              background: "var(--mx-surface)",
              borderBottom: idx < tasks.length - 1 ? "1px solid var(--mx-divider)" : "none",
              opacity: isMutating ? 0.6 : 1,
              pointerEvents: isMutating ? "none" : "auto"
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {isMutating ? (
                  <div style={{ marginTop: 4, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyItems: 'center' }}><Spinner /></div>
                ) : (
                  <input 
                    type="checkbox" 
                    id={id}
                    checked={isCompleted} 
                    onChange={() => onToggle(task.id)}
                    style={{ marginTop: 4, cursor: "pointer", width: 16, height: 16, accentColor: "var(--mx-primary)" }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <label htmlFor={id} style={{ 
                    display: "block", 
                    fontSize: 13, 
                    color: isCompleted ? "var(--mx-text-tertiary)" : "var(--mx-text)",
                    textDecoration: isCompleted ? "line-through" : "none",
                    cursor: "pointer",
                    marginBottom: 4
                  }}>
                    {task.description}
                  </label>
                  <div style={{ fontSize: 12, color: "var(--mx-text-secondary)" }}>
                    {humanizeDate(task.due_date)} &bull; {task.priority} priority
                  </div>
                </div>
                {isCompleted && onDelete && (
                  <Button variant="quiet" onClick={() => onDelete(task.id)}>Delete</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
