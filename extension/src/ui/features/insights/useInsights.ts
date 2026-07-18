import { useState, useRef, useCallback } from "react";
import { sendMessage } from "../../runtime/sendMessage";
import { createStatsRequestGuard } from "../../../popup/statsRequestGuard";

export function useInsights() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadedPeriod, setLoadedPeriod] = useState<7 | 30 | 90 | null>(null);
  const guard = useRef(createStatsRequestGuard());

  const loadStats = useCallback(async (period: 7 | 30 | 90) => {
    const request = guard.current.start();
    setLoading(true);
    setError("");
    
    try {
      const data = await sendMessage({ type: "GET_STATS", period, refresh: true });
      if (!guard.current.isCurrent(request)) return;
      
      if (data?.error) {
        setError(data.error);
      } else {
        setStats(data);
        setLoadedPeriod(period);
      }
    } catch (err: any) {
      if (!guard.current.isCurrent(request)) return;
      setError(err.message || "Failed to load statistics.");
    } finally {
      if (guard.current.isCurrent(request)) {
        setLoading(false);
      }
    }
  }, []);

  return { stats, loading, error, loadedPeriod, loadStats };
}
