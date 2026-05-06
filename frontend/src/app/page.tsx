"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("hr1");
  const [password, setPassword] = useState("pass12345");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await apiRequest<{ access: string; refresh: string }>(
        "/api/auth/token/",
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
        }
      );
      localStorage.setItem("accessToken", response.access);
      localStorage.setItem("refreshToken", response.refresh);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f5fb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "24px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .login-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e0e3f0;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          color: #1a1d2e;
          background: #fafbff;
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .login-input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
          background: #fff;
        }
        .login-input::placeholder { color: #b0b4c4; }
        .login-btn {
          width: 100%;
          padding: 11px;
          background: #4f46e5;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background .15s, transform .1s;
        }
        .login-btn:hover:not(:disabled) { background: #4338ca; }
        .login-btn:active:not(:disabled) { transform: scale(0.99); }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp .3s ease both; }
        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          color: #9097a8;
          display: flex;
          align-items: center;
          transition: color .15s;
        }
        .eye-btn:hover { color: #4f46e5; }
      `}</style>

      <div
        className="fade-up"
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#fff",
          border: "1px solid #e8eaf2",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(79,70,229,0.07)",
        }}
      >
        <div style={{ padding: "36px 32px 32px" }}>
          {/* Logo */}
          <div style={{ marginBottom: "28px" }}>
            <span
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#4f46e5",
                letterSpacing: "-0.4px",
              }}
            >
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
            <p style={{ fontSize: "13px", color: "#9097a8", marginTop: "6px", fontWeight: 400 }}>
              Sign in to your HR account to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#6b7080",
                  marginBottom: "6px",
                  letterSpacing: "0.03em",
                }}
              >
                Username
              </label>
              <input
                className="login-input"
                placeholder="e.g. hr1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#6b7080",
                  marginBottom: "6px",
                  letterSpacing: "0.03em",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: "42px" }}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  color: "#991b1b",
                  padding: "9px 13px",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <button className="login-btn" type="submit" disabled={loading} style={{ marginTop: "4px" }}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}