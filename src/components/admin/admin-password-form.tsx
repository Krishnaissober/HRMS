"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";

export function AdminPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (newPassword.length < 8) {
      setError("Use at least 8 characters for the new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new password and confirmation do not match.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: true }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(result?.message || result?.error?.message || "Password change failed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed successfully. Other sessions were signed out.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Password change failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">Current password</span>
        <span className="relative block">
          <input
            required
            type={showCurrentPassword ? "text" : "password"}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-border/70 bg-background px-4 pr-12 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
          >
            {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">New password</span>
        <span className="relative block">
          <input
            required
            minLength={8}
            type={showNewPassword ? "text" : "password"}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-border/70 bg-background px-4 pr-12 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={showNewPassword ? "Hide new password" : "Show new password"}
          >
            {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">Confirm new password</span>
        <span className="relative block">
          <input
            required
            minLength={8}
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-border/70 bg-background px-4 pr-12 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
          >
            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive-ink"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-semibold text-success-ink"
        >
          <CheckCircle2 className="size-4" />
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-primary disabled:cursor-wait disabled:opacity-70"
      >
        <LockKeyhole className="size-4" />
        {saving ? "Changing password…" : "Change password"}
      </button>
    </form>
  );
}
