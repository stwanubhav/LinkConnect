import { useState, useEffect } from "react";
import { Link } from "wouter";
import { authService } from "../cinema/authService";
import "./admin-login.css";

interface AdminLoginProps {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState("anubhavpatel2526@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [liveHash, setLiveHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lockoutSec, setLockoutSec] = useState<number>(() => authService.getLockoutRemainingSeconds());
  const [failedCount, setFailedCount] = useState<number>(() => authService.getFailedAttempts());

  // Real-time live SHA-256 hash preview (based on trimmed password)
  useEffect(() => {
    let active = true;
    const clean = password.trim();
    if (!clean) {
      setLiveHash("");
      return;
    }

    authService.computeSha256(clean).then((hash) => {
      if (active) {
        setLiveHash(hash);
      }
    });

    return () => {
      active = false;
    };
  }, [password]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSec <= 0) return;

    const timer = setInterval(() => {
      setLockoutSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSec]);

  function handleResetLockout() {
    authService.resetFailedAttempts();
    setLockoutSec(0);
    setFailedCount(0);
    setErrorMsg(null);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg("Please provide both identifier and security passphrase.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await authService.login(cleanEmail, cleanPassword);
      if (res.success) {
        setSuccessMsg("Z+ SECURITY CLEARANCE CONFIRMED. ACCESSING CONSOLE...");
        setPassword("");
        setLockoutSec(0);
        setFailedCount(0);
        setTimeout(() => {
          onSuccess();
        }, 300);
      } else {
        setErrorMsg(res.message);
        setLockoutSec(authService.getLockoutRemainingSeconds());
        setFailedCount(authService.getFailedAttempts());
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication gateway failure.");
    } finally {
      setSubmitting(false);
    }
  }

  const isLocked = lockoutSec > 0;
  const lockoutMinutes = Math.floor(lockoutSec / 60);
  const lockoutSeconds = lockoutSec % 60;

  return (
    <div className="zplus-login-root">
      <div className="zplus-grid-bg" />
      <div className="zplus-radar-glow" />

      <div className="zplus-vault-card">
        {/* Corner Brackets */}
        <div className="zplus-corner-tl" />
        <div className="zplus-corner-tr" />
        <div className="zplus-corner-bl" />
        <div className="zplus-corner-br" />

        {/* Shield Emblem & Titles */}
        <div className="zplus-header-center">
          <div className="zplus-emblem">🛡️</div>
          <h1 className="zplus-title">ADMIN SECURITY GATEWAY</h1>
        </div>

        {/* Lockout Notification with Instant Reset Button */}
        {isLocked && (
          <div className="zplus-alert-box zplus-alert-lockout">
            <span>⛔</span>
            <div style={{ flex: 1 }}>
              <strong>LOCKOUT PROTOCOL ACTIVE</strong>
              <div>
                Suspended for {String(lockoutMinutes).padStart(2, "0")}:{String(lockoutSeconds).padStart(2, "0")}. You may enter the master passphrase to override, or click below.
              </div>
              <button
                type="button"
                onClick={handleResetLockout}
                style={{
                  marginTop: "8px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  background: "#ef444433",
                  border: "1px solid #ef444488",
                  color: "#fca5a5",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                RESET LOCKOUT SHIELD ↺
              </button>
            </div>
          </div>
        )}

        {errorMsg && !isLocked && (
          <div className="zplus-alert-box zplus-alert-error">
            <span>⚠️</span>
            <div>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="zplus-alert-box zplus-alert-success">
            <span>✓</span>
            <div>{successMsg}</div>
          </div>
        )}

        {/* Authorization Form */}
        <form onSubmit={handleLogin} className="zplus-form">
          {/* Email / ID */}
          <div className="zplus-field-group">
            <label className="zplus-label" htmlFor="zplus-email">
              <span>AUTHORIZED IDENTIFIER [GMAIL]</span>
              <button
                type="button"
                onClick={() => setEmail("anubhavpatel2526@gmail.com")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#00d4ff",
                  fontSize: "10px",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Auto-fill
              </button>
            </label>
            <div className="zplus-input-wrap">
              <span className="zplus-input-prefix">ID &gt;</span>
              <input
                id="zplus-email"
                type="email"
                className="zplus-input"
                placeholder="anubhavpatel2526@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Passphrase Input */}
          <div className="zplus-field-group">
            <label className="zplus-label" htmlFor="zplus-password">
              <span>SECURITY PASSPHRASE [SHA-256 MASKED]</span>
              <span style={{ color: "#64748b" }}>256-BIT DIGEST</span>
            </label>
            <div className="zplus-input-wrap">
              <span className="zplus-input-prefix">KEY &gt;</span>
              <input
                id="zplus-password"
                type={showPassword ? "text" : "password"}
                className="zplus-input"
                placeholder="Enter authorized security passphrase"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="zplus-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>

            {/* Live Cryptographic Hash Preview */}
            {liveHash ? (
              <div className="zplus-hash-preview" title={liveHash}>
                <span className="zplus-hash-label">CRYPTO DIGEST:</span>
                <span className="zplus-hash-val">{liveHash.slice(0, 16)}...{liveHash.slice(-8)}</span>
              </div>
            ) : (
              <div className="zplus-hash-preview">
                <span className="zplus-hash-label">ENCRYPTION:</span>
                <span>Plaintext is converted to SHA-256 before verification</span>
              </div>
            )}
          </div>

          {/* Security Metrics Bar */}
          <div className="zplus-metrics-bar">
            <div className="zplus-metric-item">
              <span className="zplus-metric-lbl">SECURITY SHIELD</span>
              <span className="zplus-metric-val">
                {isLocked ? "LOCKOUT ACTIVE" : `${Math.max(0, 5 - failedCount)} ATTEMPTS LEFT`}
              </span>
            </div>
            <div className="zplus-metric-item">
              <span className="zplus-metric-lbl">SESSION TIMEOUT</span>
              <span className="zplus-metric-val">120 MIN (AUTO-LOCK)</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="zplus-submit-btn"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="zplus-spinner" />
                <span>LOGGING IN...</span>
              </>
            ) : isLocked ? (
              <span>LOG IN WITH MASTER KEY</span>
            ) : (
              <span>LOGIN</span>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="zplus-footer-nav" style={{ justifyContent: "center" }}>
          <Link href="/" className="zplus-back-link">
            ← RETURN TO 3D SHOWCASE
          </Link>
        </div>
      </div>
    </div>
  );
}
