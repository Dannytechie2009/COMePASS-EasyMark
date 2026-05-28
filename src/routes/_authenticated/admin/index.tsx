import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const { profile } = useAuth();
  if (profile && profile.role === "student") return <Navigate to="/student" />;

  const isSuper = profile?.role === "super_admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p className="text-muted-foreground">
          Signed in as <span className="font-medium">{profile?.name}</span> ({profile?.role})
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Question bank" desc="Create, edit and organise questions by subject." to="/admin/questions" />
        <Card title="Exam sessions" desc="Schedule single-subject exams and view scoreboard." to="/admin/exams" />
        <Card title="Combo exams" desc="Full 4-subject JAMB combo with product keys." to="/admin" disabled label="Coming in phase 3" />
        {isSuper && (
          <>
            <Card title="Users" desc="View and manage student accounts." to="/admin" disabled label="Coming in phase 4" />
            <Card title="Product keys" desc="Generate access codes for combo exam trials." to="/admin" disabled label="Coming in phase 3" />
          </>
        )}
      </div>
    </div>
  );
}

function Card({ title, desc, to, disabled, label }: { title: string; desc: string; to: string; disabled?: boolean; label?: string }) {
  if (disabled) {
    return (
      <div className="rounded-lg border p-5 opacity-60">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
        <span className="mt-3 inline-block text-xs rounded-full bg-muted px-2 py-1">{label}</span>
      </div>
    );
  }
  return (
    <Link to={to} className="block rounded-lg border p-5 hover:bg-accent transition-colors">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      <span className="mt-3 inline-block text-sm font-medium underline">Open →</span>
    </Link>
  );
}
