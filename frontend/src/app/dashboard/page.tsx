"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { normalizeScore } from "@/lib/score";

type ApplicationRow = {
  id: number;
  candidate_name: string;
  ai_score: string;
  created_at: string;
};

type PaginatedResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApplicationRow[];
};

type ApplicationDetail = {
  id: number;
  candidate_name: string;
  ai_score: string;
  ai_reasons: string[];
  resume: string;
  job_description: string;
  created_at: string;
};

function scoreBadge(score: number) {
  if (score >= 8) return { bg: "#dcfce7", color: "#166534", label: "Strong" };
  if (score >= 5) return { bg: "#fef9c3", color: "#854d0e", label: "Average" };
  return { bg: "#fee2e2", color: "#991b1b", label: "Weak" };
}

function scoreBarColor(score: number) {
  if (score >= 8) return "#16a34a";
  if (score >= 5) return "#ca8a04";
  return "#dc2626";
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function DashboardPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  useEffect(() => {
    async function loadRows() {
      if (!token) return;
      try {
        setError("");
        const data = await apiRequest<PaginatedResponse>(
          `/api/applications/?page=${page}&page_size=25`,
          {},
          token
        );
        setRows(data.results);
        setTotal(data.count);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load applications");
      }
    }
    loadRows();
  }, [page, token]);

  async function openDetail(id: number) {
    if (!token) return;
    const detail = await apiRequest<ApplicationDetail>(
      `/api/applications/${id}/`,
      {},
      token
    );
    setSelected(detail);
  }

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setProfileOpen(false);
    router.push("/");
  }

  const totalPages = Math.max(1, Math.ceil(total / 25));
  const qualified = rows.filter((r) => normalizeScore(r.ai_score) >= 8).length;
  const avgScore =
    rows.length > 0
      ? (rows.reduce((s, r) => s + normalizeScore(r.ai_score), 0) / rows.length).toFixed(1)
      : "—";

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
        .row-hover:hover td { background:#fafbff; }
        .view-btn { font-size:11px;padding:5px 12px;border:1px solid #e0e3f0;border-radius:6px;background:transparent;color:#6b7080;cursor:pointer;font-family:inherit;transition:all .15s; }
        .view-btn:hover { border-color:#4f46e5;color:#4f46e5;background:#fafaff; }
        .pg-btn { font-size:12px;padding:6px 14px;border:1px solid #e0e3f0;border-radius:8px;background:#fff;color:#6b7080;cursor:pointer;font-family:inherit;transition:all .15s; }
        .pg-btn:hover:not(:disabled) { border-color:#4f46e5;color:#4f46e5; }
        .pg-btn:disabled { opacity:.4;cursor:not-allowed; }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        .slide-up { animation: slideUp .25s ease both; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .2s ease both; }
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
          <div
            style={{
              padding: "14px 20px 6px",
              fontSize: "10px",
              fontWeight: 600,
              color: "#a0a3b1",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
            }}
          >
            Main
          </div>
          <Link href="/dashboard" className="sb-link active">
            <i className="ti ti-layout-dashboard" aria-hidden="true" style={{ fontSize: "17px" }} />
            Dashboard
          </Link>
          <Link href="/screen" className="sb-link">
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

      {/* ── Main content ── */}
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
            Screening Dashboard
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/screen">
              <button
                style={{
                  background: "#4f46e5",
                  color: "#fff",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  padding: "8px 18px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: "15px" }} />
                New screening
              </button>
            </Link>

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
                  {/* Backdrop */}
                  <div
                    onClick={() => setProfileOpen(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 20 }}
                  />
                  {/* Dropdown */}
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
                    {/* Profile info */}
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

                    {/* Logout */}
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
          </div>
        </header>

        <main style={{ padding: "24px 28px", flex: 1 }}>
          {/* Stat cards */}
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "24px" }}
          >
            {[
              { icon: "ti-users", iconBg: "#ede9fe", iconColor: "#4f46e5", label: "Total screened", value: total, sub: `${totalPages} pages` },
              { icon: "ti-thumb-up", iconBg: "#dcfce7", iconColor: "#16a34a", label: "Qualified (8+)", value: qualified, sub: `${total > 0 ? ((qualified / total) * 100).toFixed(0) : 0}% pass rate` },
              { icon: "ti-chart-line", iconBg: "#fef9c3", iconColor: "#ca8a04", label: "Avg AI score", value: avgScore, sub: "out of 10" },
            ].map((c) => (
              <div
                key={c.label}
                style={{
                  background: "#fff",
                  border: "1px solid #e8eaf2",
                  borderRadius: "12px",
                  padding: "18px 20px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: c.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                  }}
                >
                  <i className={`ti ${c.icon}`} aria-hidden="true" style={{ fontSize: "20px", color: c.iconColor }} />
                </div>
                <div style={{ fontSize: "11px", color: "#9097a8", fontWeight: 500, marginBottom: "4px" }}>{c.label}</div>
                <div style={{ fontSize: "28px", fontWeight: 700, color: "#1a1d2e", lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: "12px", color: "#9097a8", marginTop: "5px" }}>{c.sub}</div>
              </div>
            ))}
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
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          {/* Table header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#1a1d2e" }}>Recent applications</span>
            <span style={{ fontSize: "12px", color: "#9097a8" }}>{rows.length} results</span>
          </div>

          {/* Table */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #e8eaf2",
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#fafbff", borderBottom: "1px solid #e8eaf2" }}>
                  {["Candidate", "AI Score", "Date screened", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 18px",
                        textAlign: "left",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#9097a8",
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "3rem", textAlign: "center", color: "#c0c3d0", fontSize: "14px" }}>
                      No applications yet
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const score = normalizeScore(row.ai_score);
                    const badge = scoreBadge(score);
                    return (
                      <tr
                        key={row.id}
                        className="row-hover"
                        style={{ borderBottom: "1px solid #f0f2f8", cursor: "pointer" }}
                        onClick={() => openDetail(row.id)}
                      >
                        <td style={{ padding: "13px 18px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: "#ede9fe",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#4f46e5",
                                flexShrink: 0,
                              }}
                            >
                              {initials(row.candidate_name || "??")}
                            </div>
                            <span style={{ fontWeight: 500, color: "#1a1d2e" }}>
                              {row.candidate_name || "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "13px 18px" }}>
                          <span
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: "99px",
                            }}
                          >
                            {score}/10 · {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: "13px 18px", color: "#9097a8" }}>
                          {new Date(row.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td style={{ padding: "13px 18px" }}>
                          <button
                            className="view-btn"
                            onClick={(e) => { e.stopPropagation(); openDetail(row.id); }}
                          >
                            View →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end", marginBottom: "28px" }}>
            <button className="pg-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ← Prev
            </button>
            <span style={{ fontSize: "12px", color: "#9097a8", padding: "0 6px" }}>
              Page {page} of {totalPages}
            </span>
            <button className="pg-btn" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next →
            </button>
          </div>

          {/* Detail panel */}
          {selected && (
            <div
              className="slide-up"
              style={{ background: "#fff", border: "1px solid #e8eaf2", borderRadius: "14px", overflow: "hidden" }}
            >
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
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "#4f46e5",
                    }}
                  >
                    {initials(selected.candidate_name || "??")}
                  </div>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#1a1d2e" }}>
                      {selected.candidate_name || "Unknown"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9097a8", marginTop: "2px" }}>
                      Screened{" "}
                      {new Date(selected.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {(() => {
                    const score = normalizeScore(selected.ai_score);
                    const badge = scoreBadge(score);
                    return (
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
                        {score}/10{" "}
                        <span style={{ fontSize: "12px", fontWeight: 500 }}>· {badge.label}</span>
                      </span>
                    );
                  })()}
                  <button className="view-btn" onClick={() => setSelected(null)}>
                    Close ✕
                  </button>
                </div>
              </div>

              <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f2f8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#9097a8", fontWeight: 500 }}>Match score</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#1a1d2e" }}>
                    {normalizeScore(selected.ai_score)}/10
                  </span>
                </div>
                <div style={{ height: "6px", background: "#f0f2f8", borderRadius: "99px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${normalizeScore(selected.ai_score) * 10}%`,
                      background: scoreBarColor(normalizeScore(selected.ai_score)),
                      borderRadius: "99px",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>

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
                  {selected.ai_reasons.map((reason, i) => (
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
            </div>
          )}
        </main>
      </div>
    </div>
  );
}