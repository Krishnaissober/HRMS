"use client";

import { BrandLogo } from "@/components/layout/brand-logo";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((remaining) => Math.max(remaining - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sendCode() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/email-otp/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("We could not send a reset code to that email address.");
      setSent(true);
      setCooldown(60);
      setMessage("If an account exists for this email, a 6-digit code has been sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the reset code.");
    } finally {
      setBusy(false);
    }
  }

  function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendCode();
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/email-otp/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          result?.message || result?.error?.message || "The code is invalid or expired.",
        );
      setMessage("Password reset successfully. You can now sign in.");
      setOtp("");
      setPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell auth-shell">
      <aside className="auth-brand" aria-label="Triple Minds">
        <BrandLogo />
        <p className="eyebrow">PEOPLE. PURPOSE. PROGRESS.</p>
        <h2>A better workplace starts with your people.</h2>
        <p>Your workspace for hiring, employee management, and everything that comes next.</p>
      </aside>
      <section className="card" aria-labelledby="forgot-password-title">
        <div className="auth-card-brand"><BrandLogo /></div>
        <Link href="/" className="button-link secondary">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
        <p className="eyebrow">Triple Minds HR</p>
        <h1 id="forgot-password-title">Reset your password</h1>
        <p>We will send a one-time code to the email address registered on your account.</p>
        {!sent ? (
          <form className="candidate-form" onSubmit={requestCode}>
            <label>
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button type="submit" disabled={busy}>
              <Mail className="size-4" />
              {busy ? "Sending code…" : "Send OTP"}
            </button>
          </form>
        ) : (
          <form className="candidate-form" onSubmit={resetPassword}>
            <label>
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              6-digit OTP
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
            <label>
              New password
              <span className="password-input-wrap">
                <input
                  required
                  minLength={8}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide new password" : "Show new password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </label>
            <button type="submit" disabled={busy}>
              <KeyRound className="size-4" />
              {busy ? "Resetting…" : "Reset password"}
            </button>
            <button
              type="button"
              className="button-link secondary"
              disabled={busy || cooldown > 0}
              onClick={() => void sendCode()}
            >
              <Mail className="size-4" />
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              className="button-link secondary"
              onClick={() => {
                setSent(false);
                setCooldown(0);
                setMessage("");
                setError("");
              }}
            >
              Use a different email
            </button>
          </form>
        )}
        {message ? (
          <p role="status" className="form-message">
            <CheckCircle2 className="size-4" />
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="form-message">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
