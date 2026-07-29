"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api-client";
import type { IntelFeedItem, IntelSignal } from "../lib/types";

function SignalsList({ feedId }: { feedId: string }) {
  const [signals, setSignals] = useState<IntelSignal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listIntelSignals(feedId)
      .then((result) => {
        if (!cancelled) setSignals(result);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load signals.");
      });
    return () => {
      cancelled = true;
    };
  }, [feedId]);

  if (error) return <p style={{ color: "#b00020", fontSize: "0.85rem" }}>{error}</p>;
  if (!signals) return <p style={{ fontSize: "0.85rem", color: "#777" }}>Loading signals…</p>;
  if (signals.length === 0) return <p style={{ fontSize: "0.85rem", color: "#777" }}>No signals extracted yet.</p>;

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {signals.map((signal) => (
        <li key={signal.id} style={{ fontSize: "0.85rem", borderLeft: "3px solid #999", paddingLeft: "0.5rem" }}>
          <strong>{signal.signalType}</strong> (severity {signal.severity.toFixed(2)}, confidence {signal.confidence.toFixed(2)}) —{" "}
          {signal.summary}
          {signal.relatedTechniqueIds.length > 0 && (
            <div style={{ color: "#555" }}>Techniques: {signal.relatedTechniqueIds.map((t) => t.techniqueId).join(", ")}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function IntelFeedsPanel({ projectId }: { projectId: string }) {
  const [feeds, setFeeds] = useState<IntelFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    api
      .listIntelFeeds(projectId)
      .then(setFeeds)
      .catch(() => setError("Failed to load intel feeds."))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, [projectId]);

  useEffect(() => {
    const hasPending = feeds.some((f) => f.status === "pending");
    if (!hasPending) return;
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [feeds]);

  const handleUrlSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.submitIntelFeedUrl(projectId, url);
      setUrl("");
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit intel feed URL.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePdfChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitIntelFeedPdf(projectId, file);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to upload intel feed PDF.");
    } finally {
      setSubmitting(false);
      event.target.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <form onSubmit={handleUrlSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="url"
          required
          placeholder="https://example.com/advisory"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ flex: 1, padding: "0.4rem" }}
        />
        <button type="submit" disabled={submitting} style={{ padding: "0.4rem 1rem" }}>
          Submit URL
        </button>
      </form>
      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        Or upload a PDF advisory:
        <input type="file" accept="application/pdf" onChange={handlePdfChange} disabled={submitting} />
      </label>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}

      {loading && <p style={{ color: "#777" }}>Loading feeds…</p>}
      {!loading && feeds.length === 0 && <p style={{ color: "#777" }}>No intel feeds submitted yet.</p>}
      {!loading && feeds.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {feeds.map((feed) => (
            <li key={feed.id} style={{ border: "1px solid #ddd", borderRadius: 6, padding: "0.6rem 0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ overflowWrap: "anywhere" }}>
                  <strong>{feed.sourceType.toUpperCase()}</strong> {feed.sourceRef}
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    padding: "0.1rem 0.5rem",
                    borderRadius: 999,
                    background: feed.status === "processed" ? "#e3f6e8" : feed.status === "failed" ? "#fbe3e3" : "#f0f0f0",
                  }}
                >
                  {feed.status}
                </span>
              </div>
              {feed.failureReason && <p style={{ color: "#b00020", fontSize: "0.85rem" }}>{feed.failureReason}</p>}
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === feed.id ? null : feed.id)}
                style={{ marginTop: "0.4rem", fontSize: "0.85rem", background: "none", border: "none", color: "#0645ad", cursor: "pointer", padding: 0 }}
              >
                {expandedId === feed.id ? "Hide signals" : "Show signals"}
              </button>
              {expandedId === feed.id && <SignalsList feedId={feed.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
