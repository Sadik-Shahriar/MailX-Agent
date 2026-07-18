import React, { useEffect, useState } from "react";
import { Stack, Section } from "../../components/Layout";
import { SegmentedControl } from "../../components/SegmentedControl";
import { InlineAlert, Skeleton } from "../../components/Feedback";
import { Button } from "../../components/Button";
import { useInsights } from "./useInsights";

export function InsightsView() {
  const [period, setPeriod] = useState<7 | 30 | 90>(7);
  const { stats, loading, error, loadedPeriod, loadStats } = useInsights();
  const hasCurrentStats = loadedPeriod === period && stats !== null;

  useEffect(() => {
    loadStats(period);
  }, [period, loadStats]);

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

        {error && <InlineAlert variant="error" title="Could not load statistics" action={<Button variant="secondary" onClick={() => loadStats(period)}>Retry</Button>}>{error}</InlineAlert>}
        
        {loading && !hasCurrentStats && !error && (
          <Stack gap={3}>
            <Skeleton height={80} />
            <Skeleton height={80} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Skeleton height={60} />
              <Skeleton height={60} />
              <Skeleton height={60} />
              <Skeleton height={60} />
            </div>
          </Stack>
        )}

        {hasCurrentStats && (
          <Stack gap={3}>
            <ComparisonBar 
              title="Emails" 
              items={[
                { label: "Sent", value: metricValue(stats.sent), color: "var(--mx-primary)" },
                { label: "Received", value: metricValue(stats.received), color: "var(--mx-success)" }
              ]} 
            />
            <ComparisonBar 
              title="Tasks" 
              items={[
                { label: "Completed", value: metricValue(stats.completedTasks), color: "var(--mx-success)" },
                { label: "Pending", value: metricValue(stats.pendingTasks), color: "var(--mx-warning)" }
              ]} 
            />
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <MetricCard label="Emails sent" value={metricValue(stats.sent)} />
              <MetricCard label="Emails received" value={metricValue(stats.received)} />
              <MetricCard label="Tasks completed" value={metricValue(stats.completedTasks)} />
              <MetricCard label="Tasks pending" value={metricValue(stats.pendingTasks)} />
            </div>
          </Stack>
        )}
      </Stack>
    </div>
  );
}

function metricValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "var(--mx-surface-subtle)", borderRadius: "var(--mx-radius-lg)", padding: 12 }}>
      <strong style={{ display: "block", fontSize: 20, color: "var(--mx-text)" }}>{value}</strong>
      <span style={{ color: "var(--mx-text-secondary)", fontSize: 12 }}>{label}</span>
    </div>
  );
}

function ComparisonBar({ title, items }: { title: string; items: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ marginBottom: 4 }}>
      <h3 style={{ fontSize: 13, margin: "0 0 8px", color: "var(--mx-text)", fontWeight: 600 }}>{title}</h3>
      {items.map(item => (
        <div key={item.label} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--mx-text-secondary)", marginBottom: 4 }}>
            <span>{item.label}</span>
            <span style={{ fontWeight: 600, color: "var(--mx-text)" }}>{item.value}</span>
          </div>
          <div role="img" aria-label={`${item.label}: ${item.value}`} style={{ height: 12, background: "var(--mx-surface-subtle)", borderRadius: 6, overflow: "hidden" }}>
            <div 
              style={{ 
                height: "100%", 
                width: `${Math.min((item.value / max) * 100, 100)}%`, 
                background: item.color, 
                borderRadius: 6, 
                transition: "width 0.4s ease" 
              }} 
            />
          </div>
        </div>
      ))}
    </div>
  );
}
