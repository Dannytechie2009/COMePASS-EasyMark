import { createFileRoute, Link, Outlet, Navigate, useNavigate } from "@tanstack/react-router";
import { signOut } from "firebase/auth";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  if (!profile) return <div className="min-h-screen grid place-items-center text-muted-foreground">No profile found. Contact admin.</div>;

  const isAdmin = profile.role === "tutor" || profile.role === "super_admin";

  const links = isAdmin
    ? [
        { to: "/admin", label: "Dashboard" },
        { to: "/admin/exams", label: "Exams" },
        { to: "/admin/questions", label: "Questions" },
        { to: "/admin/syllabus", label: "Syllabus" },
        { to: "/admin/users", label: "Users" },
        { to: "/admin/departments", label: "Analytics" },
      ]
    : [
        { to: "/student", label: "Exams" },
        { to: "/student/results", label: "Results" },
      ];

  async function handleSignOut() {
    await signOut(getFirebaseAuth());
    nav({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" onClick={() => setOpen(false)}>
            <BrandMark size={36} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-5 text-sm">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-primary transition-colors">
                {l.label}
              </Link>
            ))}
            <span className="text-muted-foreground truncate max-w-[160px]">{profile.name}</span>
            <Button size="sm" variant="outline" onClick={handleSignOut}>Sign out</Button>
          </nav>

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label="Toggle menu"
            className="lg:hidden inline-flex items-center justify-center rounded-md border p-2"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="lg:hidden border-t bg-background">
            <nav className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-col gap-1 text-sm">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 hover:bg-muted transition-colors"
                >
                  {l.label}
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
        <div className="bg-secondary/15 border-b border-secondary/30 text-secondary-foreground text-sm px-6 py-2 text-center">
          Please <Link to="/verify-email" className="underline font-medium">verify your email</Link> to take exams.
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 sm:px-6 py-8 text-xs text-muted-foreground text-center">
        COMePASS Prevarsity · Impacting lives for global relevance
      </footer>
    </div>
  );
}
