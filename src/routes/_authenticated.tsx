import { createFileRoute, Link, Outlet, Navigate, useNavigate } from "@tanstack/react-router";
import { signOut } from "firebase/auth";
import { useAuth } from "@/lib/auth-context";
import { getFirebaseAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

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
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold">JAMB CBT</Link>
          <nav className="flex items-center gap-3 text-sm">
            {isAdmin ? (
              <>
                <Link to="/admin" className="hover:underline">Dashboard</Link>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{profile.role}</span>
              </>
            ) : (
              <Link to="/student" className="hover:underline">My exams</Link>
            )}
            <span className="text-muted-foreground hidden sm:inline">{profile.name}</span>
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
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-b border-yellow-300 text-yellow-900 dark:text-yellow-100 text-sm px-6 py-2 text-center">
          Please <Link to="/verify-email" className="underline font-medium">verify your email</Link> to take exams.
        </div>
      )}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
