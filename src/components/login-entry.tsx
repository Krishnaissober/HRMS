"use client";
import { useEffect, useState } from "react";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
export function LoginEntry({
  signedInWithoutAccess = false,
  databaseUnavailable = false,
  localActivationEnabled = false,
  userName,
}: {
  signedInWithoutAccess?: boolean;
  databaseUnavailable?: boolean;
  localActivationEnabled?: boolean;
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
  async function activateLocalAccount() {
    if (!localActivationEnabled) return;
    const response = await fetch("/api/auth/activate-local", {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.error?.message || "Could not activate the local account.");
    }
  }
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
  }, [signedInWithoutAccess]);
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
      setBusy(false);
      setMessage("Unable to reach the server. Make sure the HRMS app is running and try again.");
      return;
    }
    if (!response.ok) {
      setBusy(false);
      setMessage("Sign-in failed. Check your email and password.");
      return;
    }
    try {
      await activateLocalAccount();
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "Could not activate the local account.");
      return;
    }
    setBusy(false);
    window.location.assign("/");
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
      setBusy(false);
      setMessage("Unable to reach the server. Make sure the HRMS app is running and try again.");
      return;
    }
    if (!response.ok) {
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
    try {
      await activateLocalAccount();
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "Could not activate the local account.");
      return;
    }
    setBusy(false);
    window.location.assign("/");
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
  return (
    <main className="shell">
      <section className="card" aria-labelledby="title">
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
            <button type="button" disabled={signingOut} onClick={() => void signOut()}>
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
