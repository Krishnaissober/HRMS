"use client";

import Link from "next/link";
import Image from "next/image";
import { Camera, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

type Profile = {
  user: {
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
    createdAt: string;
  };
  organization: { name: string; membershipStatus: string };
  roles: Array<{ name: string; slug: string }>;
  unreadNotifications: number;
};

const shortcuts = [
  ["Open HR dashboard", "/hr/dashboard", "Review current hiring activity and priorities."],
  ["Manage candidates", "/hr/candidates", "Review applications, documents, and candidate history."],
  ["Schedule interviews", "/hr/interviews", "View and manage the interview pipeline."],
  ["Open notifications", "/hr/notifications", "Review new submissions and assigned actions."],
] as const;

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("Loading profile…");
  const [imageSaving, setImageSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/v1/me/profile");
        const result = await response.json();
        if (!response.ok) return setMessage(result.error?.message || "Could not load profile");
        setProfile(result.data);
        setMessage("");
      } catch {
        setMessage("Could not reach the profile service");
      }
    })();
  }, []);

  if (!profile)
    return (
      <main className="page-shell">
        <section className="panel">
          <p role="status">{message}</p>
        </section>
      </main>
    );
  const initials = profile.user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function saveProfileImage(image: string | null) {
    setImageSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error?.message || "Could not update profile picture");
        return;
      }
      setProfile((current) =>
        current ? { ...current, user: { ...current.user, image } } : current,
      );
      setMessage(image ? "Profile picture updated." : "Profile picture removed.");
    } catch {
      setMessage("Could not reach the profile service");
    } finally {
      setImageSaving(false);
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!("image/jpeg" === file.type || "image/png" === file.type || "image/webp" === file.type)) {
      setMessage("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 1_500_000) {
      setMessage("Profile pictures must be smaller than 1.5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") void saveProfileImage(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="page-shell profile-page">
      <section className="panel profile-single-card">
        <section className="profile-hero">
          <div className="profile-avatar">
            {profile.user.image ? (
              <Image src={profile.user.image} alt="" width={64} height={64} unoptimized />
            ) : (
              initials
            )}
          </div>
          <div className="profile-hero-copy">
            <p className="eyebrow">My profile</p>
            <h1>{profile.user.name}</h1>
            <p>{profile.user.email}</p>
            <span className="profile-status">
              {profile.organization.name} ·{" "}
              {profile.organization.membershipStatus === "ACTIVE"
                ? "Active HR account"
                : profile.organization.membershipStatus}
            </span>
          </div>
          <div className="profile-hero-action profile-picture-actions">
            <span className="profile-status">HR account</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={handleImageChange}
              aria-label="Choose a profile picture"
            />
            <button
              type="button"
              className="button-link secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageSaving}
            >
              {profile.user.image ? <Camera className="size-4" /> : <Upload className="size-4" />}
              {imageSaving ? "Saving…" : profile.user.image ? "Change photo" : "Add photo"}
            </button>
            {profile.user.image && (
              <button
                type="button"
                className="button-link ghost profile-picture-remove"
                onClick={() => void saveProfileImage(null)}
                disabled={imageSaving}
              >
                <Trash2 className="size-4" /> Remove
              </button>
            )}
          </div>
        </section>

        <div className="profile-grid">
          <section className="profile-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Account</p>
                <h2>Profile information</h2>
              </div>
            </div>
            <dl className="details profile-details">
              <dt>Full name</dt>
              <dd>{profile.user.name}</dd>
              <dt>Email</dt>
              <dd>{profile.user.email}</dd>
              <dt>Email status</dt>
              <dd>{profile.user.emailVerified ? "Verified" : "Verification required"}</dd>
              <dt>Member since</dt>
              <dd>{new Date(profile.user.createdAt).toLocaleDateString()}</dd>
            </dl>
          </section>
          <section className="profile-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Access</p>
                <h2>Company access</h2>
              </div>
            </div>
            <p className="profile-company-name">{profile.organization.name}</p>
            <p className="profile-muted">
              Your access is restricted to the authenticated Triple Minds HR workspace.
            </p>
            <div className="profile-role-list">
              {profile.roles.map((role) => (
                <span className="profile-role" key={role.slug}>
                  {role.name}
                </span>
              ))}
            </div>
            <Link className="button-link secondary" href="/me/security">
              Manage account security
            </Link>
          </section>
        </div>

        <section className="profile-card profile-shortcuts-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>HR shortcuts</h2>
            </div>
            <span className="profile-notification-count">
              {profile.unreadNotifications} unread notification
              {profile.unreadNotifications === 1 ? "" : "s"}
            </span>
          </div>
          <div className="profile-shortcuts">
            {shortcuts.map(([label, href, description]) => (
              <Link className="profile-shortcut" href={href} key={href}>
                <strong>{label}</strong>
                <span>{description}</span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
