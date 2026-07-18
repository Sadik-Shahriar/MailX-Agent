import { useState, useCallback, useRef } from "react";
import { sendMessage } from "../../runtime/sendMessage";
import type { Task } from "../../../shared/types";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mutatingTasks, setMutatingTasks] = useState<Set<string>>(new Set());
  const [deletingCompleted, setDeletingCompleted] = useState(false);
  const requestVersion = useRef(0);

  const startRequest = () => ++requestVersion.current;
  const isCurrent = (request: number) => request === requestVersion.current;

  const addMutating = (id: string) => setMutatingTasks(prev => new Set(prev).add(id));
  const removeMutating = (id: string) => setMutatingTasks(prev => { 
    const next = new Set(prev); 
    next.delete(id); 
    return next; 
  });

  const loadData = useCallback(async (period: 7 | 30 | 90) => {
    const request = startRequest();
    setLoading(true);
    setError("");
    try {
      const [tasksData, remindersData] = await Promise.all([
        sendMessage({ type: "GET_TASKS", period }).catch(e => ({ error: e.message })),
        sendMessage({ type: "GET_REMINDERS" }).catch(() => ({ reminders: [] }))
      ]);

      if (!isCurrent(request)) return;
      if (tasksData?.error) {
        setError(tasksData.error);
      } else {
        setTasks(Array.isArray(tasksData?.tasks) ? tasksData.tasks : []);
      }
      
      setReminders(remindersData?.reminders || []);
    } catch (err: any) {
      if (isCurrent(request)) setError(err.message || "Failed to load tasks.");
    } finally {
      if (isCurrent(request)) setLoading(false);
    }
  }, []);

  const toggleTask = async (id: string, period: 7 | 30 | 90) => {
    const request = startRequest();
    addMutating(id);
    setError("");
    try {
      const data = await sendMessage({ type: "TOGGLE_TASK", task_id: id, period });
      if (isCurrent(request) && Array.isArray(data?.tasks)) setTasks(data.tasks);
    } catch (err: any) {
      if (isCurrent(request)) setError(err.message || "Could not update task.");
    } finally {
      removeMutating(id);
    }
  };

  const deleteTask = async (id: string, period: 7 | 30 | 90) => {
    const request = startRequest();
    addMutating(id);
    setError("");
    try {
      const data = await sendMessage({ type: "DELETE_TASK", task_id: id, period });
      if (isCurrent(request) && Array.isArray(data?.tasks)) setTasks(data.tasks);
    } catch (err: any) {
      if (isCurrent(request)) setError(err.message || "Could not delete task.");
    } finally {
      removeMutating(id);
    }
  };

  const deleteAllCompletedTasks = async (period: 7 | 30 | 90) => {
    const request = startRequest();
    setDeletingCompleted(true);
    setError("");
    try {
      const data = await sendMessage({ type: "DELETE_COMPLETED_TASKS", period });
      if (isCurrent(request) && Array.isArray(data?.tasks)) setTasks(data.tasks);
    } catch (err: any) {
      if (isCurrent(request)) setError(err.message || "Could not delete completed tasks.");
    } finally {
      setDeletingCompleted(false);
    }
  };

  const dismissReminder = async (id: string, period: 7 | 30 | 90) => {
    const request = startRequest();
    addMutating(id);
    setError("");
    try {
      const data = await sendMessage({ type: "DISMISS_REMINDER", reminder_id: id });
      if (!isCurrent(request)) return;
      setReminders(Array.isArray(data?.reminders) ? data.reminders : []);
    } catch (err: any) {
      if (isCurrent(request)) setError(err.message || "Could not dismiss reminder.");
    } finally {
      removeMutating(id);
    }
  };

  return {
    tasks,
    reminders,
    loading,
    error,
    mutatingTasks,
    deletingCompleted,
    loadData,
    toggleTask,
    deleteTask,
    deleteAllCompletedTasks,
    dismissReminder
  };
}
