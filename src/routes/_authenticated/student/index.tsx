import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/student/")({
  component: StudentHome,
});

function StudentHome() {
  const { profile } = useAuth();
  if (profile && profile.role !== "student") return <Navigate to="/admin" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {profile?.name}</h1>
        <p className="text-muted-foreground">
          Student ID: <span className="font-mono">{profile?.studentId}</span> · Department:{" "}
          <span className="capitalize">{profile?.department}</span>
        </p>
      </div>

      <section className="rounded-lg border p-6">
        <h2 className="font-semibold mb-2">Your subjects</h2>
        <div className="flex flex-wrap gap-2">
          {profile?.subjects?.map((s) => (
            <span key={s} className="rounded-full bg-secondary px-3 py-1 text-sm">{s}</span>
          ))}
        </div>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="font-semibold mb-2">Upcoming exams</h2>
        <p className="text-sm text-muted-foreground">
          No exams scheduled for your subjects yet. They'll appear here when your tutor creates one.
        </p>
      </section>
    </div>
  );
}
