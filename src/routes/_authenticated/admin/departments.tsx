import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { DEPARTMENTS, type Department, type Gender, type Subject } from "@/lib/subjects";
import type { Attempt } from "@/lib/exams";
import { BarChart3, TrendingUp, Users as UsersIcon } from "lucide-react";

interface UserDoc {
  uid: string;
  role: string;
  department?: Department;
  subjects?: Subject[];
  gender?: Gender;
}

export const Route = createFileRoute("/_authenticated/admin/departments")({
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const { profile } = useAuth();
  if (profile && profile.role === "student") return <Navigate to="/student" />;

  const [users, setUsers] = useState<UserDoc[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    const u = onSnapshot(collection(getDb(), "users"), (s) =>
      setUsers(s.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })) as UserDoc[]),
    );
    const a = onSnapshot(collection(getDb(), "attempts"), (s) =>
      setAttempts(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Attempt[]),
    );
    return () => { u(); a(); };
  }, []);

  const uidToDept = useMemo(() => {
    const m = new Map<string, Department>();
    for (const u of users) if (u.department) m.set(u.uid, u.department);
    return m;
  }, [users]);

  const deptStats = useMemo(() => {
    return DEPARTMENTS.map((d) => {
      const students = users.filter((u) => u.role === "student" && u.department === d.id);
      const deptAttempts = attempts.filter(
        (a) => a.submitted && uidToDept.get(a.uid) === d.id,
      );
      const avg = deptAttempts.length
        ? Math.round(
            deptAttempts.reduce(
              (s, a) => s + ((a.score ?? 0) / Math.max(1, a.totalPossible ?? 1)) * 100,
              0,
            ) / deptAttempts.length,
          )
        : 0;
      return {
        ...d,
        students: students.length,
        attempts: deptAttempts.length,
        avg,
      };
    });
  }, [users, attempts, uidToDept]);

  const subjectStats = useMemo(() => {
    const map: Record<string, { score: number; total: number; attempts: number }> = {};
    for (const a of attempts) {
      if (!a.submitted || !a.breakdown) continue;
      for (const [subj, b] of Object.entries(a.breakdown)) {
        const cur = map[subj] ?? { score: 0, total: 0, attempts: 0 };
        cur.score += b.score;
        cur.total += b.total;
        cur.attempts += 1;
        map[subj] = cur;
      }
    }
    return Object.entries(map)
      .map(([subj, v]) => ({ subj, ...v, pct: v.total ? Math.round((v.score / v.total) * 100) : 0 }))
      .sort((a, b) => b.attempts - a.attempts);
  }, [attempts]);

  const maxAttempts = Math.max(1, ...subjectStats.map((s) => s.attempts));

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <BarChart3 className="size-6 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Department analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Participation and average scores by department and subject.</p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {deptStats.map((d) => (
          <div key={d.id} className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold text-lg">{d.label}</h3>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Dept</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xl font-bold">{d.students}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Students</div>
              </div>
              <div>
                <div className="text-xl font-bold">{d.attempts}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Attempts</div>
              </div>
              <div>
                <div className="text-xl font-bold text-primary">{d.avg}%</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg</div>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${d.avg}%` }} />
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-lg">Subject performance</h2>
        <p className="text-sm text-muted-foreground">Average score and participation across all submitted attempts.</p>
        <div className="mt-5 space-y-3">
          {subjectStats.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">No submitted attempts yet.</p>
          )}
          {subjectStats.map((s) => (
            <div key={s.subj} className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
              <span className="text-sm font-medium truncate">{s.subj}</span>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(s.attempts / maxAttempts) * 100}%` }} />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums w-28 text-right">
                {s.attempts} attempts · <span className="text-foreground font-semibold">{s.pct}%</span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
