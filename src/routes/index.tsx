import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, profile, loading, configured } = useAuth();

  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-xl space-y-4 rounded-lg border p-8">
          <h1 className="text-2xl font-bold">Firebase not configured</h1>
          <p className="text-muted-foreground">
            Open <code className="px-1 py-0.5 rounded bg-muted">src/lib/firebase.ts</code> and paste your Firebase
            Web config. You can get it from Firebase Console → Project Settings → Your apps → Web app.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;

  if (user && profile) {
    return <Navigate to={profile.role === "student" ? "/student" : "/admin"} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="font-bold text-lg">JAMB CBT</div>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/login">Log in</Link></Button>
            <Button asChild><Link to="/register">Sign up</Link></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Practice JAMB UTME the way you'll take it.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Real CBT timing, shuffled questions, and instant scoring. Built for the tutorial classroom.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Button asChild size="lg"><Link to="/register">Get started</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/login">I have an account</Link></Button>
        </div>
      </main>
    </div>
  );
}
