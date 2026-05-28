import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { computeStatus, type ExamSession } from "@/lib/exams";

export const Route = createFileRoute("/_authenticated/student/")({
  component: StudentHome,
});

function StudentHome() {
  const { profile } = useAuth();
  if (profile && profile.role !== "student") return <Navigate to="/admin" />;

  const [sessions, setSessions] = useState<ExamSession[]>([]);

  useEffect(() => {
    if (!profile?.subjects?.length) return;
    const q = query(
      collection(getDb(), "examSessions"),
      where("subject", "in", profile.subjects.slice(0, 30)),
      orderBy("startAt", "desc"),
    );
    return onSnapshot(q, (s) => setSessions(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
  }, [profile?.subjects]);

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

      <section className="space-y-3">
        <h2 className="font-semibold">Exams for your subjects</h2>
        {sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">No exams scheduled yet.</p>
        )}
        {sessions.map((s) => {
          const status = computeStatus(s);
          const target = status === "corrections_open" ? "/student/exam/$sessionId/result" : "/student/exam/$sessionId";
          return (
            <Link
              key={s.id}
              to={target}
              params={{ sessionId: s.id }}
              className="block rounded-lg border p-4 hover:bg-accent transition-colors"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {s.subject} · {s.durationMinutes} min · {s.startAt.toDate().toLocaleString()}
                  </div>
                </div>
                <StatusPill status={status} />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    live: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    ended: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    corrections_open: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  };
  return <span className={`text-xs px-2 py-1 rounded-full h-fit ${colors[status]}`}>{status.replace("_", " ")}</span>;
}
