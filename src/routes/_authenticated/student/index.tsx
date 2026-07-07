import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  computeStatus,
  formatDurationFromMs,
  getSessionSubjects,
  sessionMatchesStudent,
  type Attempt,
  type ExamSession,
} from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarClock, CheckCircle2, Clock3, KeyRound, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/")({
  component: StudentHome,
});

function StudentHome() {
  const { profile } = useAuth();
  if (profile && profile.role !== "student") return <Navigate to="/admin" />;

  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
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

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(collection(getDb(), "attempts"), where("uid", "==", profile.uid));
    return onSnapshot(q, (snap) => {
      setAttempts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, () => setAttempts([]));
  }, [profile?.uid]);

  const attemptsBySession = useMemo(() => {
    const m = new Map<string, Attempt>();
    for (const a of attempts) m.set(a.sessionId, a);
    return m;
  }, [attempts]);

  const visibleSessions = useMemo(
    () => sessions.filter((session) => sessionMatchesStudent(session, profile?.subjects ?? [], profile?.department)),
    [sessions, profile?.subjects, profile?.department],
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

      <ExamsList sessions={visibleSessions} attemptsBySession={attemptsBySession} queryError={queryError} />
    </div>
  );
}

const HIDDEN_KEY = "comepass:hiddenSessions";

function loadHidden(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function saveHidden(s: Set<string>) {
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(s))); } catch { /* ignore */ }
}

function ExamsList({ sessions, attemptsBySession, queryError }: { sessions: ExamSession[]; attemptsBySession: Map<string, Attempt>; queryError: string | null }) {
  const [hidden, setHidden] = useState<Set<string>>(() => loadHidden());
  const [filter, setFilter] = useState<"all" | "live" | "upcoming" | "recent" | "corrections">("all");

  const now = Date.now();
  const DAY = 86_400_000;

  const enriched = useMemo(() => sessions.map((s) => {
    const status = computeStatus(s);
    const startMs = s.startAt.toMillis();
    const endMs = startMs + s.durationMinutes * 60_000;
    let bucket: "live" | "upcoming" | "recent" | "older" | "corrections";
    if (status === "corrections_open") bucket = "corrections";
    else if (status === "live") bucket = "live";
    else if (status === "scheduled") bucket = "upcoming";
    else bucket = now - endMs <= 7 * DAY ? "recent" : "older";
    return { s, status, startMs, endMs, bucket };
  }), [sessions, now]);

  const filtered = enriched.filter(({ s, bucket }) => {
    if (hidden.has(s.id)) return false;
    if (filter === "all") return true;
    return bucket === filter;
  });

  const counts = {
    live: enriched.filter((x) => x.bucket === "live" && !hidden.has(x.s.id)).length,
    upcoming: enriched.filter((x) => x.bucket === "upcoming" && !hidden.has(x.s.id)).length,
    corrections: enriched.filter((x) => x.bucket === "corrections" && !hidden.has(x.s.id)).length,
    recent: enriched.filter((x) => x.bucket === "recent" && !hidden.has(x.s.id)).length,
  };

  function hideOne(id: string) {
    const next = new Set(hidden); next.add(id); setHidden(next); saveHidden(next);
  }
  function clearHistory() {
    const toHide = enriched.filter((x) => x.status === "ended").map((x) => x.s.id);
    const next = new Set(hidden); toHide.forEach((id) => next.add(id)); setHidden(next); saveHidden(next);
  }
  function resetHidden() {
    setHidden(new Set()); saveHidden(new Set());
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Exams for your subjects</h2>
          <p className="text-sm text-muted-foreground">Filter by status or clear old sessions from your view.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={clearHistory} disabled={counts.recent === 0 && enriched.every((x) => x.status !== "ended")}>Clear history</Button>
          {hidden.size > 0 && <Button size="sm" variant="ghost" onClick={resetHidden}>Restore hidden ({hidden.size})</Button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all" as const, label: "All", n: filtered.length + (filter === "all" ? 0 : 0) },
          { id: "live" as const, label: "Live now", n: counts.live },
          { id: "upcoming" as const, label: "Upcoming", n: counts.upcoming },
          { id: "corrections" as const, label: "Corrections open", n: counts.corrections },
          { id: "recent" as const, label: "Finished recently", n: counts.recent },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${filter === tab.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
          >{tab.label}{tab.id !== "all" && ` (${tab.n})`}</button>
        ))}
      </div>

      {queryError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Exams could not load just now. Please refresh in a moment.
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card px-6 py-10 text-center shadow-sm">
          <p className="text-base font-medium">Nothing to show here.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hidden.size > 0 ? "You have hidden sessions — restore them above." : "Once your tutor publishes a session for your subjects, it will show up here."}
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {filtered.map(({ s, status, startMs, endMs, bucket }) => {
          const attempt = attemptsBySession.get(s.id);
          const hasSubmitted = !!attempt?.submitted;
          const inProgress = !!attempt && !attempt.submitted;
          const target = hasSubmitted
            ? "/student/exam/$sessionId/result"
            : status === "corrections_open"
              ? "/student/exam/$sessionId/result"
              : "/student/exam/$sessionId";
          const subjects = getSessionSubjects(s);
          const label = describeWhen({ status, startMs, endMs, now });
          const cta = hasSubmitted
            ? (status === "corrections_open" ? "View corrections" : "View your result")
            : inProgress
              ? "Resume exam"
              : status === "corrections_open"
                ? "View corrections"
                : status === "live"
                  ? "Enter exam"
                  : status === "scheduled"
                    ? "Open details"
                    : "View summary";
          return (
            <div key={s.id} className="group relative rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <Link
                to={target}
                params={{ sessionId: s.id }}
                className="block"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={status} />
                      {hasSubmitted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                          <CheckCircle2 className="size-3" /> You submitted
                        </span>
                      )}
                      {inProgress && (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">In progress</span>
                      )}
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                        {s.mode === "combo" ? "Combo exam" : "Single subject"}
                      </span>
                      {s.requiresProductKey && !hasSubmitted && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Product key required</span>
                      )}
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>

                    <div>
                      <div className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">{s.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {subjects.join(" • ")} · {formatDurationFromMs(s.durationMinutes * 60_000)} · {s.startAt.toDate().toLocaleString()}
                      </div>
                      {hasSubmitted && attempt?.totalPossible != null && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Score: <span className="font-mono text-foreground">{attempt.score}/{attempt.totalPossible}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button variant={hasSubmitted ? "outline" : status === "live" ? "default" : "outline"} className="sm:self-center">
                    {cta}
                  </Button>
                </div>
              </Link>
              {(bucket === "recent" || bucket === "older") && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); hideOne(s.id); }}
                  className="absolute top-3 right-3 text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                >Hide</button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function describeWhen({ status, startMs, endMs, now }: { status: string; startMs: number; endMs: number; now: number }) {
  const MIN = 60_000, HR = 3_600_000, DAY = 86_400_000;
  if (status === "scheduled") {
    const diff = startMs - now;
    if (diff < HR) return `Starts in ${Math.max(1, Math.round(diff / MIN))} min`;
    if (diff < DAY) return `Starts in ${Math.round(diff / HR)} h`;
    return `Starts in ${Math.round(diff / DAY)} days`;
  }
  if (status === "live") {
    const left = endMs - now;
    return left > 0 ? `Ends in ${Math.max(1, Math.round(left / MIN))} min` : "Ending now";
  }
  const ago = now - endMs;
  if (status === "corrections_open") return "Corrections released";
  if (ago < HR) return "Just finished";
  if (ago < DAY) return `Ended ${Math.max(1, Math.round(ago / HR))}h ago`;
  if (ago < 7 * DAY) return `Ended ${Math.round(ago / DAY)}d ago`;
  if (ago < 30 * DAY) return `Ended ${Math.round(ago / (7 * DAY))}w ago`;
  return `Ended on ${new Date(endMs).toLocaleDateString()}`;
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
  const map: Record<string, { cls: string; label: string }> = {
    scheduled: { cls: "bg-primary/10 text-primary", label: "Upcoming" },
    live: { cls: "bg-green-500/15 text-green-700 dark:text-green-400", label: "Live now" },
    ended: { cls: "bg-muted text-muted-foreground", label: "Ended" },
    corrections_open: { cls: "bg-accent/15 text-accent-foreground", label: "Corrections open" },
  };
  const info = map[status] ?? { cls: "bg-muted text-muted-foreground", label: status };
  return <span className={`h-fit rounded-full px-2.5 py-1 text-xs font-medium ${info.cls}`}>{info.label}</span>;
}
