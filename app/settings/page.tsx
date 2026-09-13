import { redirect } from "next/navigation";

/**
 * Settings was split into /profile (profile growth) and /dashboard
 * (posting cadence lives there now) — this keeps old links/bookmarks
 * working instead of 404ing.
 */
export default function SettingsRedirectPage() {
  redirect("/profile");
}
