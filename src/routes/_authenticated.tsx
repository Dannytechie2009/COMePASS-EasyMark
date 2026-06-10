import { createFileRoute, Link, Outlet, Navigate, useNavigate } from "@tanstack/react-router";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Menu, X, Bell } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseAuth, getDb } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { Label } from "@/components/ui/label";
import { listenAnnouncements, listenReadIds, announcementVisibleTo, type Announcement } from "@/lib/announcements";
import { listenLegal, type LegalDoc } from "@/lib/legal";
import type { Gender } from "@/lib/subjects";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  // Announcements (for unread badge)
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  useEffect(() => listenAnnouncements(setAllAnnouncements), []);
  useEffect(() => {
    if (!profile?.uid) return;
    return listenReadIds(profile.uid, setReadIds);
  }, [profile?.uid]);

  // Legal versions (for student "please read" banner)
  const [privacy, setPrivacy] = useState<LegalDoc | null>(null);
  const [terms, setTerms] = useState<LegalDoc | null>(null);
  useEffect(() => listenLegal("privacy", setPrivacy), []);
  useEffect(() => listenLegal("terms", setTerms), []);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  if (!profile) return <div className="min-h-screen grid place-items-center text-muted-foreground">No profile found. Contact admin.</div>;

  const isAdmin = profile.role === "tutor" || profile.role === "super_admin";

  const visibleAnnouncements = allAnnouncements.filter((a) =>
    isAdmin ? true : announcementVisibleTo(a, profile.department, profile.subjects),
  );
  const unreadCount = visibleAnnouncements.filter((a) => !readIds.has(a.id)).length;

  const links = isAdmin
    ? [
        { to: "/admin", label: "Dashboard" },
        { to: "/admin/exams", label: "Exams" },
        { to: "/admin/questions", label: "Questions" },
        { to: "/admin/syllabus", label: "Syllabus" },
        { to: "/admin/announcements", label: "Announcements" },
        { to: "/admin/users", label: "Users" },
        { to: "/admin/departments", label: "Analytics" },
        ...(profile.role === "super_admin" ? [{ to: "/admin/legal", label: "Legal" }] : []),
        { to: "/settings", label: "Settings" },
      ]
    : [
        { to: "/student", label: "Exams" },
        { to: "/student/results", label: "Results" },
        { to: "/student/announcements", label: "Notifications" },
        { to: "/settings", label: "Settings" },
      ];

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
    nav({ to: "/login" });
  }

  // BLOCKER: missing required profile fields (e.g. gender).
  const missingGender = profile.role === "student" && !profile.gender;

  // Banner: new legal versions to acknowledge (students only).
  const needsLegalAck =
    profile.role === "student" &&
    ((privacy && (profile.acknowledgedLegal?.privacy ?? 0) < privacy.version) ||
      (terms && (profile.acknowledgedLegal?.terms ?? 0) < terms.version));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" onClick={() => setOpen(false)}>
            <BrandMark size={36} />
          </Link>

          <nav className="hidden lg:flex items-center gap-5 text-sm">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-primary transition-colors relative">
                {l.label}
                {l.label === "Notifications" && unreadCount > 0 && (
                  <span className="absolute -top-2 -right-3 rounded-full bg-secondary text-secondary-foreground text-[10px] px-1.5 py-0.5">
                    {unreadCount}
                  </span>
                )}
              </Link>
            ))}
            <span className="text-muted-foreground truncate max-w-[160px]">{profile.name}</span>
            <Button size="sm" variant="outline" onClick={handleSignOut}>Sign out</Button>
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            {!isAdmin && unreadCount > 0 && (
              <Link to="/student/announcements" className="relative rounded-md border p-2">
                <Bell className="size-4" />
                <span className="absolute -top-1 -right-1 rounded-full bg-secondary text-secondary-foreground text-[10px] px-1">
                  {unreadCount}
                </span>
              </Link>
            )}
            <button
              type="button"
              aria-label="Toggle menu"
              className="inline-flex items-center justify-center rounded-md border p-2"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t bg-background">
            <nav className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-col gap-1 text-sm">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 hover:bg-muted transition-colors flex items-center justify-between"
                >
                  <span>{l.label}</span>
                  {l.label === "Notifications" && unreadCount > 0 && (
                    <span className="rounded-full bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5">{unreadCount}</span>
                  )}
                </Link>
              ))}
              <div className="border-t mt-2 pt-3 flex items-center justify-between gap-2 px-3">
                <span className="text-muted-foreground truncate">{profile.name}</span>
                <Button size="sm" variant="outline" onClick={handleSignOut}>Sign out</Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {!user.emailVerified && (
        <div className="bg-secondary/15 border-b border-secondary/30 text-secondary-foreground text-sm px-4 sm:px-6 py-2 text-center">
          Please <Link to="/verify-email" className="underline font-medium">verify your email</Link> to take exams.
        </div>
      )}

      {needsLegalAck && (
        <div className="bg-primary/10 border-b border-primary/30 text-sm px-4 sm:px-6 py-2 text-center">
          Our <Link to="/privacy" className="underline font-medium">Privacy Policy</Link> and{" "}
          <Link to="/terms" className="underline font-medium">Terms</Link> have been updated. Please review them.
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {missingGender ? <GenderGate uid={profile.uid} /> : <Outlet />}
      </main>

      <footer className="mx-auto max-w-6xl px-4 sm:px-6 py-8 text-xs text-muted-foreground text-center space-x-3">
        <span>COMePASS Prevarsity · Impacting lives for global relevance</span>
        <Link to="/privacy" className="underline">Privacy</Link>
        <Link to="/terms" className="underline">Terms</Link>
      </footer>
    </div>
  );
}

function GenderGate({ uid }: { uid: string }) {
  const [g, setG] = useState<Gender | "">("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!g) return toast.error("Please select your gender");
    setBusy(true);
    try {
      await updateDoc(doc(getDb(), "users", uid), { gender: g });
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/95 backdrop-blur px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold">One quick thing</h2>
          <p className="text-sm text-muted-foreground mt-1">
            We've added a required profile field. Please tell us your gender so we can keep your records complete. You'll only be asked once.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["male", "female", "other"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setG(opt)}
                className={`rounded-md border px-2 py-2 text-sm capitalize transition-colors ${
                  g === opt ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={save} disabled={busy} className="w-full">{busy ? "Saving…" : "Continue"}</Button>
      </div>
    </div>
  );
}
