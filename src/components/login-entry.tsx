"use client";

import { BrandLogo } from "@/components/layout/brand-logo";
import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Globe2, LogIn, UserPlus } from "lucide-react";
import {
  establishClientTabSession,
  getClientTabPath,
  prepareClientTabOAuth,
} from "@/lib/tab-session-client";
export function LoginEntry({
  signedInWithoutAccess = false,
  databaseUnavailable = false,
  localActivationEnabled = false,
  googleOAuthEnabled = false,
  userName,
}: {
  signedInWithoutAccess?: boolean;
  databaseUnavailable?: boolean;
  localActivationEnabled?: boolean;
  googleOAuthEnabled?: boolean;
  userName?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const finishAuthentication = useCallback(async (path: string) => {
    setIsClosing(true);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 760;
    await new Promise<void>((resolve) => window.setTimeout(resolve, duration));
    window.location.assign(path);
  }, []);
  const activateLocalAccount = useCallback(async () => {
    if (!localActivationEnabled) return;
    const response = await fetch("/api/auth/activate-local", {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.error?.message || "Could not activate the local account.");
    }
  }, [localActivationEnabled]);
  useEffect(() => {
    if (!signedInWithoutAccess || !localActivationEnabled) return;
    let cancelled = false;
    void activateLocalAccount()
      .then(() => {
        if (!cancelled) window.location.assign("/");
      })
      .catch((error) => {
        if (!cancelled)
          setMessage(
            error instanceof Error ? error.message : "Could not activate the local account.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [activateLocalAccount, localActivationEnabled, signedInWithoutAccess]);
  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    let response: Response;
    try {
      response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      setIsClosing(false);
      setBusy(false);
      setMessage("Unable to reach the server. Make sure the HRMS app is running and try again.");
      return;
    }
    if (!response.ok) {
      setIsClosing(false);
      setBusy(false);
      setMessage("Sign-in failed. Check your email and password.");
      return;
    }
    const sessionToken = response.headers.get("set-auth-token");
    if (!sessionToken) {
      setIsClosing(false);
      setBusy(false);
      setMessage("Sign-in did not create an isolated browser-tab session. Please try again.");
      return;
    }
    try {
      await establishClientTabSession(sessionToken);
      await activateLocalAccount();
    } catch (error) {
      setIsClosing(false);
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "Could not activate the local account.");
      return;
    }
    setBusy(false);
    await finishAuthentication(getClientTabPath("/"));
  }
  async function signUp(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    let response: Response;
    try {
      response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
    } catch {
      setIsClosing(false);
      setBusy(false);
      setMessage("Unable to reach the server. Make sure the HRMS app is running and try again.");
      return;
    }
    if (!response.ok) {
      setIsClosing(false);
      setBusy(false);
      const result = await response.json().catch(() => null);
      setMessage(
        result?.message ||
          result?.error?.message ||
          (response.status >= 500
            ? "The account could not be created because the server database is unavailable."
            : "Could not create the account. Check the details and try again."),
      );
      return;
    }
    const sessionToken = response.headers.get("set-auth-token");
    if (!sessionToken) {
      setIsClosing(false);
      setBusy(false);
      setMessage(
        "Account creation did not create an isolated browser-tab session. Please try again.",
      );
      return;
    }
    try {
      await establishClientTabSession(sessionToken);
      await activateLocalAccount();
    } catch (error) {
      setIsClosing(false);
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "Could not activate the local account.");
      return;
    }
    setBusy(false);
    await finishAuthentication(getClientTabPath("/"));
  }
  async function signOut() {
    setSigningOut(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        setMessage("Could not sign out. Please try again.");
        setSigningOut(false);
        return;
      }
      window.location.replace("/");
    } catch {
      setMessage("Could not sign out. Please try again.");
      setSigningOut(false);
    }
  }
  async function signInWithGoogle() {
    setGoogleBusy(true);
    setMessage("");
    try {
      const tabId = await prepareClientTabOAuth();
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: `${window.location.origin}/t/${tabId}/`,
          disableRedirect: true,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.url) {
        throw new Error(
          result?.message || result?.error?.message || "Google sign-in is not available.",
        );
      }
      window.location.assign(result.url);
    } catch (error) {
      setIsClosing(false);
      setGoogleBusy(false);
      setMessage(error instanceof Error ? error.message : "Google sign-in failed.");
    }
  }
  return (
    <main className={`shell auth-shell${isClosing ? " auth-shell-closing" : ""}`}>
      <aside className="auth-brand auth-brand-init" aria-label="Triple Minds">
        <div className="auth-brand-motion" aria-hidden="true" />
        <div className="auth-brand-top">
          <BrandLogo />
          <span className="auth-brand-chip">Triple Minds HRMS</span>
        </div>
        <div className="auth-brand-content">
          <div className="auth-brand-copy">
            <p className="eyebrow">PEOPLE. PURPOSE. PROGRESS.</p>
            <h2>A better workplace starts with your people.</h2>
            <p>Your workspace for hiring, employee management, and everything that comes next.</p>
          </div>
          <div className="auth-brand-points" aria-label="HRMS capabilities">
            <span>Hiring</span>
            <span>People operations</span>
            <span>Growth</span>
          </div>
        </div>
        <div className="auth-brand-footer">
          <span className="auth-brand-dot" /> Secure people operations{" "}
          <span className="auth-brand-line" /> Est. 2024
        </div>
      </aside>
      <section className="card auth-card-init" aria-labelledby="title">
        <div className="auth-card-brand">
          <BrandLogo />
        </div>
        <p className="eyebrow">Triple Minds HR</p>
        <h1 id="title">
          {databaseUnavailable
            ? "Database connection required"
            : signedInWithoutAccess
              ? "Triple Minds access required"
              : "Sign in"}
        </h1>
        {databaseUnavailable ? (
          <p role="alert">
            The HR portal cannot connect to its local database. Check the PostgreSQL credentials in
            your
            <code> .env.local </code> file and restart the application.
          </p>
        ) : signedInWithoutAccess ? (
          <>
            <p>
              {userName || "Your account"} is signed in but has no active Triple Minds membership.
              Contact an administrator for access.
            </p>
            <button
              type="button"
              className="sign-out-button"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <>
            <form className="candidate-form" onSubmit={creating ? signUp : signIn}>
              {creating && (
                <label>
                  Name
                  <input
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}
              <label>
                Email
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Password
                <span className="password-input-wrap">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete={creating ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </span>
              </label>
              <button type="submit" disabled={busy}>
                {creating ? (
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                )}
                {busy
                  ? creating
                    ? "Creating account…"
                    : "Signing in…"
                  : creating
                    ? "Create account"
                    : "Sign in"}
              </button>
              {message && (
                <p className="form-message" role="alert">
                  {message}
                </p>
              )}
            </form>
            {!creating && googleOAuthEnabled && (
              <>
                <div className="auth-divider" aria-hidden="true">
                  <span>or</span>
                </div>
                <button
                  type="button"
                  className="button-link secondary google-auth-button"
                  disabled={busy || googleBusy}
                  onClick={() => void signInWithGoogle()}
                >
                  <Globe2 className="h-4 w-4" aria-hidden="true" />
                  {googleBusy ? "Connecting to Google…" : "Continue with Google"}
                </button>
              </>
            )}
            <button
              type="button"
              className="button-link secondary auth-mode-toggle"
              onClick={() => {
                setCreating((value) => !value);
                setMessage("");
              }}
            >
              {creating ? "Already have an account? Sign in" : "Create a new account"}
            </button>
            {!creating && (
              <a className="button-link secondary auth-mode-toggle" href="/forgot-password">
                Forgot password?
              </a>
            )}
          </>
        )}
      </section>
    </main>
  );
}
