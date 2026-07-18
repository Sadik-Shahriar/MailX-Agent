import React, { useState } from "react";
import type { SecurityPanelData } from "../../../content/panel/PanelController";
import { Button } from "../../components/Button";

export function SecurityResultView({ data, onBack }: { data: SecurityPanelData; onBack: () => void }) {
  const [retrying, setRetrying] = useState(false);
  const title = data.type === "priority" ? "Priority details" : data.type === "spam" ? "Spam details" : "Link safety details";
  const retry = () => {
    setRetrying(true);
    data.retry();
  };

  return <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Button variant="secondary" onClick={onBack}>Back</Button>
      <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
    </div>
    {data.status === "unavailable" ? <>
      <div role="alert" style={{ color: "var(--mx-danger)", background: "var(--mx-danger-soft)", padding: 12 }}>{data.message}</div>
      <Button variant="primary" disabled={retrying} onClick={retry}>{retrying ? "Retrying..." : "Retry"}</Button>
    </> : data.type === "priority" ? <dl>
      <dt>Priority</dt><dd>{data.result.priority}</dd>
      <dt>Category</dt><dd>{data.result.category}</dd>
      <dt>Confidence</dt><dd>{Math.round(data.result.confidence * 100)}%</dd>
    </dl> : data.type === "spam" ? <dl>
      <dt>Verdict</dt><dd>{data.result.verdict}</dd>
      <dt>Reason</dt><dd>{data.result.reason}</dd>
      <dt>Confidence</dt><dd>{Math.round(data.result.confidence * 100)}%</dd>
      <dt>Category</dt><dd>{data.result.category}</dd>
      <dt>Source</dt><dd>{data.result.source}</dd>
    </dl> : data.status === "none" ? <p>No HTTP(S) links were found in this email.</p> : <>
      <p>{data.checkedCount} link{data.checkedCount === 1 ? "" : "s"} checked.</p>
      <ul>{data.results.map((result) => <li key={result.url}><strong>{result.verdict}</strong>: {result.hostname} - {result.reason} ({Math.round(result.confidence * 100)}%, {result.source})</li>)}</ul>
    </>}
  </div>;
}
