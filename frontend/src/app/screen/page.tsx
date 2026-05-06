"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";
import { normalizeScore } from "@/lib/score";

const IS_MOCK = true;

type StreamingState = {
  raw: string;
  score?: number;
  reasons: string[];
  candidateName?: string;
};

function scoreBadge(score: number) {
  if (score >= 8) return { bg: "#dcfce7", color: "#166534", label: "Strong match" };
  if (score >= 5) return { bg: "#fef9c3", color: "#854d0e", label: "Average match" };
  return { bg: "#fee2e2", color: "#991b1b", label: "Weak match" };
}

function scoreBarColor(score: number) {
  if (score >= 8) return "#16a34a";
  if (score >= 5) return "#ca8a04";
  return "#dc2626";
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function ScreenPage() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [streaming, setStreaming] = useState<StreamingState>({ raw: "", reasons: [] });
  const [profileOpen, setProfileOpen] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const parsedPreview = useMemo(() => {
    try {
      return JSON.parse(streaming.raw);
    } catch {
      return null;
    }
  }, [streaming.raw]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) { setError("Please sign in first."); return; }
    setLoading(true);
    setError("");
    setStreaming({ raw: "", reasons: [] });

    try {
      const response = await fetch(`${API_BASE_URL}/api/screen/stream/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_description: jobDescription, resume }),
      });
      if (!response.ok || !response.body) throw new Error("Unable to start screening stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const eventChunk of events) {
          const dataLine = eventChunk.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.replace("data: ", ""));
          if (payload.type === "chunk") {
            setStreaming((prev) => ({ ...prev, raw: prev.raw + payload.content }));
          }
          if (payload.type === "error") {
            setError(payload.detail ?? "AI provider error");
            setLoading(false);
            return;
          }
          if (payload.type === "final") {
            const app = payload.application;
            setStreaming({
              raw: app.ai_raw_response ?? "",
              score: normalizeScore(app.ai_score),
              reasons: app.ai_reasons ?? [],
              candidateName: app.candidate_name || "Unknown",
            });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Screening failed");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setProfileOpen(false);
    router.push("/");
  }

  const previewScore = parsedPreview?.score
    ? normalizeScore(String(parsedPreview.score))
    : undefined;
  const previewReasons: string[] = Array.isArray(parsedPreview?.reasons)
    ? parsedPreview.reasons.slice(0, 3)
    : [];

  const finalScore = streaming.score;
  const badge = finalScore !== undefined ? scoreBadge(finalScore) : null;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f4f5fb",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#1a1d2e",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        a { text-decoration: none; }
        .sb-link { display:flex;align-items:center;gap:10px;padding:9px 14px;margin:2px 8px;border-radius:8px;font-size:13px;font-weight:500;color:#6b7080;transition:all .15s; }
        .sb-link:hover { background:#f0f0ff;color:#4f46e5; }
        .sb-link.active { background:#ede9fe;color:#4f46e5; }
        textarea { width:100%;background:#fff;border:1px solid #e0e3f0;border-radius:10px;padding:14px 16px;color:#1a1d2e;font-family:'Inter',-apple-system,sans-serif;font-size:13px;line-height:1.65;resize:vertical;outline:none;transition:border-color .15s; }
        textarea:focus { border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,.1); }
        textarea::placeholder { color:#c0c3d0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .3s ease both; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.35} }
        .pulse { animation: pulse 1.4s infinite; }
        @keyframes barFill { from{width:0%} }
        .bar-anim { animation: barFill .7s ease both; }
        .logout-btn { width:100%;padding:11px 16px;background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:#dc2626;font-family:inherit;text-align:left;transition:background .15s; }
        .logout-btn:hover { background:#fff5f5; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: "230px",
          background: "#fff",
          borderRight: "1px solid #e8eaf2",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #e8eaf2" }}>
          <span style={{ fontSize: "18px", fontWeight: 700, color: "#4f46e5", letterSpacing: "-0.4px" }}>
            Screener
            <span
              style={{
                display: "inline-block",
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#4f46e5",
                marginLeft: "3px",
                verticalAlign: "middle",
              }}
            />
          </span>
        </div>

        <nav style={{ flex: 1, paddingTop: "8px" }}>
          <div style={{ padding: "14px 20px 6px", fontSize: "10px", fontWeight: 600, color: "#a0a3b1", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
            Main
          </div>
          <Link href="/dashboard" className="sb-link">
            <i className="ti ti-layout-dashboard" aria-hidden="true" style={{ fontSize: "17px" }} />
            Dashboard
          </Link>
          <Link href="/screen" className="sb-link active">
            <i className="ti ti-file-search" aria-hidden="true" style={{ fontSize: "17px" }} />
            New screening
          </Link>
        </nav>

        <div style={{ borderTop: "1px solid #e8eaf2", paddingBottom: "8px" }}>
          <Link href="#" className="sb-link">
            <i className="ti ti-settings" aria-hidden="true" style={{ fontSize: "17px" }} />
            Settings
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            background: "#fff",
            borderBottom: "1px solid #e8eaf2",
            padding: "0 28px",
            height: "58px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#1a1d2e" }}>
            Candidate Screening
          </span>

          {/* ── Profile Avatar + Dropdown ── */}
          <div style={{ position: "relative" }}>
            <div
              onClick={() => setProfileOpen((v) => !v)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#ede9fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: 700,
                color: "#4f46e5",
                cursor: "pointer",
                userSelect: "none",
                border: profileOpen ? "2px solid #4f46e5" : "2px solid transparent",
                transition: "border .15s",
              }}
            >
              A
            </div>

            {profileOpen && (
              <>
                <div
                  onClick={() => setProfileOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 20 }}
                />
                <div
                  className="fade-up"
                  style={{
                    position: "absolute",
                    top: "46px",
                    right: 0,
                    zIndex: 30,
                    background: "#fff",
                    border: "1px solid #e8eaf2",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(79,70,229,0.10)",
                    minWidth: "200px",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "16px", borderBottom: "1px solid #f0f2f8", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: "#ede9fe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#4f46e5",
                        flexShrink: 0,
                      }}
                    >
                      A
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1d2e" }}>Admin</div>
                      <div style={{ fontSize: "11px", color: "#9097a8", marginTop: "2px" }}>HR Account</div>
                    </div>
                  </div>
                  <button className="logout-btn" onClick={handleLogout}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main style={{ padding: "28px 28px", flex: 1 }}>
          <div style={{ marginBottom: "22px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1d2e", marginBottom: "6px" }}>
              Screen a candidate
            </h1>
            <p style={{ fontSize: "13px", color: "#9097a8" }}>
              Paste a job description and resume — AI will score and explain the match.
            </p>
          </div>

          {/* Form card */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e8eaf2",
              borderRadius: "14px",
              padding: "24px",
              marginBottom: "20px",
            }}
          >
            <form onSubmit={onSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7080", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <i className="ti ti-briefcase" aria-hidden="true" style={{ fontSize: "14px", color: "#4f46e5" }} />
                    Job description
                  </div>
                  <textarea
                    rows={11}
                    placeholder="Paste the job description here…"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#6b7080", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <i className="ti ti-id-badge" aria-hidden="true" style={{ fontSize: "14px", color: "#4f46e5" }} />
                    Candidate resume
                  </div>
                  <textarea
                    rows={11}
                    placeholder="Paste the candidate's resume here…"
                    value={resume}
                    onChange={(e) => setResume(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: loading ? "#e0e3f0" : "#4f46e5",
                    color: loading ? "#9097a8" : "#fff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    padding: "10px 22px",
                    borderRadius: "8px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "background .15s",
                  }}
                >
                  {loading ? (
                    <>
                      <span
                        className="pulse"
                        style={{
                          display: "inline-block",
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#4f46e5",
                        }}
                      />
                      Screening…
                    </>
                  ) : (
                    <>
                      <i className="ti ti-brain" aria-hidden="true" style={{ fontSize: "16px" }} />
                      Screen candidate
                    </>
                  )}
                </button>
                {loading && (
                  <span style={{ fontSize: "13px", color: "#9097a8" }}>
                    AI is analyzing the resume…
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#991b1b",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          {/* Result / streaming panel */}
          {(streaming.raw || streaming.score !== undefined) && (
            <div
              className="fade-up"
              style={{
                background: "#fff",
                border: "1px solid #e8eaf2",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              {streaming.score !== undefined && badge ? (
                <>
                  {/* Final result header */}
                  <div
                    style={{
                      padding: "20px 24px",
                      borderBottom: "1px solid #e8eaf2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap" as const,
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "46px",
                          height: "46px",
                          borderRadius: "50%",
                          background: "#ede9fe",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "15px",
                          fontWeight: 700,
                          color: "#4f46e5",
                        }}
                      >
                        {initials(streaming.candidateName || "??")}
                      </div>
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: 600, color: "#1a1d2e" }}>
                          {streaming.candidateName}
                        </div>
                        <div style={{ fontSize: "12px", color: "#9097a8", marginTop: "2px" }}>
                          Screening complete
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        fontSize: "18px",
                        fontWeight: 700,
                        padding: "8px 18px",
                        borderRadius: "10px",
                      }}
                    >
                      {finalScore}/10{" "}
                      <span style={{ fontSize: "12px", fontWeight: 500 }}>· {badge.label}</span>
                    </span>
                  </div>

                  {/* ── Demo mode banner ── */}
                  {IS_MOCK && (
                    <div
                      style={{
                        padding: "10px 24px",
                        background: "#fffbeb",
                        borderBottom: "1px solid #fde68a",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "9px",
                        fontSize: "12px",
                        color: "#92400e",
                        lineHeight: 1.5,
                      }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: 0, marginTop: "1px" }}
                      >
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <span>
                        <strong>Demo mode active</strong> — The AI screening engine is not connected yet.
                        A real API key is required to generate live scores. The result below is a
                        placeholder response returned by the mock fallback, so scores and analysis
                        may not reflect the actual candidate or job description.
                      </span>
                    </div>
                  )}

                  {/* Score bar */}
                  <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f2f8" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", color: "#9097a8", fontWeight: 500 }}>Match score</span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#1a1d2e" }}>{finalScore}/10</span>
                    </div>
                    <div style={{ height: "6px", background: "#f0f2f8", borderRadius: "99px", overflow: "hidden" }}>
                      <div
                        className="bar-anim"
                        style={{
                          height: "100%",
                          width: `${(finalScore ?? 0) * 10}%`,
                          background: scoreBarColor(finalScore ?? 0),
                          borderRadius: "99px",
                        }}
                      />
                    </div>
                  </div>

                  {/* Reasons */}
                  <div style={{ padding: "18px 24px" }}>
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#9097a8",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.07em",
                        marginBottom: "14px",
                      }}
                    >
                      AI Analysis
                    </div>
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {streaming.reasons.map((reason, i) => (
                        <li
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px",
                            fontSize: "14px",
                            color: "#3a3d52",
                            lineHeight: 1.55,
                          }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: "#4f46e5",
                              marginTop: "7px",
                              flexShrink: 0,
                            }}
                          />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                /* Streaming preview */
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <span
                      className="pulse"
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#4f46e5",
                      }}
                    />
                    <span style={{ fontSize: "13px", color: "#9097a8" }}>Streaming AI response…</span>
                    {previewScore !== undefined && (
                      <span
                        style={{
                          marginLeft: "auto",
                          background: scoreBadge(previewScore).bg,
                          color: scoreBadge(previewScore).color,
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: "99px",
                        }}
                      >
                        Provisional: {previewScore}/10
                      </span>
                    )}
                  </div>

                  {previewReasons.length > 0 && (
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "7px", marginBottom: "14px" }}>
                      {previewReasons.map((r, i) => (
                        <li
                          key={i}
                          style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "#9097a8" }}
                        >
                          <span
                            style={{
                              width: "5px",
                              height: "5px",
                              borderRadius: "50%",
                              background: "#c7c9e0",
                              marginTop: "6px",
                              flexShrink: 0,
                            }}
                          />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div
                    style={{
                      background: "#fafbff",
                      border: "1px solid #e8eaf2",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      color: "#9097a8",
                      lineHeight: 1.6,
                      wordBreak: "break-all" as const,
                      maxHeight: "120px",
                      overflowY: "auto" as const,
                    }}
                  >
                    {streaming.raw || "…"}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}