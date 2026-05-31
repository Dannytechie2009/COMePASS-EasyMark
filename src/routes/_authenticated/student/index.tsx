import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  computeStatus,
  formatDurationFromMs,
  getSessionSubjects,
  sessionMatchesStudent,
  type ExamSession,
} from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarClock, Clock3, KeyRound, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/")({
  component: StudentHome,
});

function StudentHome() {
  const { profile } = useAuth();
  if (profile && profile.role !== "student") return <Navigate to="/admin" />;

  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.subjects?.length) return;
    const q = query(collection(getDb(), "examSessions"), orderBy("startAt", "desc"));
    return onSnapshot(
      q,
      (s) => {
        setQueryError(null);
        setSessions(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (error) => {
        setQueryError(error.message);
        setSessions([]);
      },
    );
  }, [profile?.subjects]);

  const visibleSessions = useMemo(
    () => sessions.filter((session) => sessionMatchesStudent(session, profile?.subjects ?? [])),
    [sessions, profile?.subjects],
  );

  const upcomingCount = visibleSessions.filter((session) => computeStatus(session) === "scheduled").length;
  const liveCount = visibleSessions.filter((session) => computeStatus(session) === "live").length;
  const comboCount = visibleSessions.filter((session) => session.mode === "combo").length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:px-8 lg:py-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              Student workspace
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back, {profile?.name}</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Track your scheduled mocks, join live sessions quickly, and keep your subject preparation in one calm workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1.5 font-mono text-foreground">{profile?.studentId}</span>
              <span className="rounded-full bg-muted px-3 py-1.5 capitalize">{profile?.department} department</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MetricCard icon={CalendarClock} label="Upcoming" value={upcomingCount} />
            <MetricCard icon={Clock3} label="Live now" value={liveCount} accent />
            <MetricCard icon={KeyRound} label="Combo" value={comboCount} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <h2 className="font-semibold">Your subjects</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {profile?.subjects?.map((s) => (
              <span key={s} className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1.5 text-sm font-medium text-secondary">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold">Exam readiness</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your timer starts from the moment you open a live exam.</p>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="rounded-xl bg-muted/60 px-4 py-3">Verify your email before starting any session.</li>
            <li className="rounded-xl bg-muted/60 px-4 py-3">Combo exams may require a product key before access is granted.</li>
            <li className="rounded-xl bg-muted/60 px-4 py-3">Your answers save as you go, so refreshes won’t wipe progress.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Exams for your subjects</h2>
          <p className="text-sm text-muted-foreground">Single-subject mocks and full JAMB combinations assigned to you.</p>
        </div>

        {queryError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Exams could not load just now. I’ve removed the index-dependent query, so this should clear after the preview refreshes.
          </div>
        )}

        {visibleSessions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card px-6 py-10 text-center shadow-sm">
            <p className="text-base font-medium">No exams scheduled yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Once your tutor publishes a session for your subjects, it will show up here automatically.</p>
          </div>
        )}

        <div className="grid gap-4">
          {visibleSessions.map((s) => {
          const status = computeStatus(s);
          const target = status === "corrections_open" ? "/student/exam/$sessionId/result" : "/student/exam/$sessionId";
          const subjects = getSessionSubjects(s);
          return (
            <Link
              key={s.id}
              to={target}
              params={{ sessionId: s.id }}
              className="group rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={status} />
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      {s.mode === "combo" ? "Combo exam" : "Single subject"}
                    </span>
                    {s.requiresProductKey && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Product key required</span>
                    )}
                  </div>

                  <div>
                    <div className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">{s.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {subjects.join(" • ")} · {formatDurationFromMs(s.durationMinutes * 60_000)} · {s.startAt.toDate().toLocaleString()}
                    </div>
                  </div>
                </div>

                <Button variant={status === "live" ? "default" : "outline"} className="sm:self-center">
                  {status === "corrections_open" ? "View result" : status === "live" ? "Enter exam" : "Open details"}
                </Button>
              </div>
            </Link>
          );
        })}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-primary/30 bg-primary/10" : "border-border/70 bg-muted/40"}`}>
      <Icon className={`mb-3 size-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-primary/10 text-primary",
    live: "bg-secondary/15 text-secondary",
    ended: "bg-muted text-muted-foreground",
    corrections_open: "bg-accent/10 text-accent",
  };
  return <span className={`h-fit rounded-full px-2.5 py-1 text-xs font-medium capitalize ${colors[status]}`}>{status.replace("_", " ")}</span>;
}
