import { createFileRoute, Link, Outlet, Navigate, useNavigate } from "@tanstack/react-router";
import { signOut } from "firebase/auth";
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

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" />;
  if (!profile) return <div className="min-h-screen grid place-items-center text-muted-foreground">No profile found. Contact admin.</div>;

  const isAdmin = profile.role === "tutor" || profile.role === "super_admin";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/"><BrandMark size={36} /></Link>
          <nav className="flex items-center gap-2 sm:gap-4 text-sm">
            {isAdmin ? (
              <>
                <Link to="/admin" className="hidden sm:inline hover:text-primary transition-colors">Dashboard</Link>
                <Link to="/admin/exams" className="hidden md:inline hover:text-primary transition-colors">Exams</Link>
                <Link to="/admin/questions" className="hidden md:inline hover:text-primary transition-colors">Questions</Link>
                <Link to="/admin/users" className="hidden lg:inline hover:text-primary transition-colors">Users</Link>
                <Link to="/admin/departments" className="hidden lg:inline hover:text-primary transition-colors">Analytics</Link>
              </>
            ) : (
              <>
                <Link to="/student" className="hover:text-primary transition-colors">Exams</Link>
                <Link to="/student/results" className="hover:text-primary transition-colors">Results</Link>
              </>
            )}
            <span className="text-muted-foreground hidden sm:inline truncate max-w-[140px]">{profile.name}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await signOut(getFirebaseAuth());
                nav({ to: "/login" });
              }}
            >
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      {!user.emailVerified && (
        <div className="bg-secondary/10 border-b border-secondary/30 text-secondary text-sm px-6 py-2 text-center">
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
