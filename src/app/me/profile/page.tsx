"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

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

  return (
    <main className="page-shell profile-page">
      <section className="profile-hero panel">
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
        <div className="profile-hero-action">
          <span className="profile-status">HR account</span>
        </div>
      </section>

      <div className="profile-grid">
        <section className="panel profile-card">
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
        <section className="panel profile-card">
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
        </section>
      </div>

      <section className="panel profile-card">
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
    </main>
  );
}
