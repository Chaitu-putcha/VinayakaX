"use client";

import { UserCircle } from "lucide-react";

interface ProfileAvatarProps {
  photoUrl?: string | null;
  name?: string | null;
  /** Tailwind size classes, e.g. "h-8 w-8". Defaults to a small navbar size. */
  sizeClassName?: string;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileAvatar({
  photoUrl,
  name,
  sizeClassName = "h-8 w-8",
  className = "",
}: ProfileAvatarProps) {
  // Fix the UI 404 by prepending the backend host to relative static paths
  const displayUrl = photoUrl?.startsWith("/") 
    ? `http://127.0.0.1:8000${photoUrl}` 
    : photoUrl;

  if (displayUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={displayUrl}
        alt={name ? `${name}'s profile photo` : "Profile photo"}
        className={`${sizeClassName} rounded-full object-cover border border-stone-300 dark:border-stone-700 shrink-0 ${className}`}
      />
    );
  }

  const initials = name ? getInitials(name) : "";
  if (initials) {
    return (
      <div
        className={`${sizeClassName} rounded-full bg-gradient-to-b from-saffron-400 to-saffron-600 flex items-center justify-center text-white font-bold text-xs shrink-0 ${className}`}
        aria-label={`${name}'s initials`}
      >
        {initials}
      </div>
    );
  }

  return <UserCircle className={`${sizeClassName} shrink-0 ${className}`} />;
}