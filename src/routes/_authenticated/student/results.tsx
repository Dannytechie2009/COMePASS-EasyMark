import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Attempt } from "@/lib/exams";
import { Trophy, Clock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/results")({
  component: ResultsPage,
});

function ResultsPage() {
  const { profile } = useAuth();
  if (profile && profile.role !== "student") return <Navigate to="/admin" />;

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(getDb(), "attempts"), where("uid", "==", profile.uid));
    return onSnapshot(
      q,
      (s) => {
        setErr(null);
        const list = s.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Attempt[];
        list.sort((a, b) => (b.startedAt?.toMillis?.() ?? 0) - (a.startedAt?.toMillis?.() ?? 0));
        setAttempts(list);
      },
      (e) => setErr(e.message),
    );
  }, [profile]);

  const submitted = attempts.filter((a) => a.submitted);
  const avg = submitted.length
    ? Math.round(
        submitted.reduce((s, a) => s + ((a.score ?? 0) / Math.max(1, a.totalPossible ?? 1)) * 100, 0) /
          submitted.length,
      )
    : 0;
  const best = submitted.reduce(
    (b, a) => {
      const p = a.totalPossible ? ((a.score ?? 0) / a.totalPossible) * 100 : 0;
      return p > b ? p : b;
    },
    0,
  );

  return (
    <div className="space-y-8">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My results</h1>
            <p className="text-sm text-muted-foreground mt-1">Every exam you've taken, with your latest scores.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full sm:w-auto">
            <Stat label="Attempts" value={attempts.length} />
            <Stat label="Average" value={`${avg}%`} accent />
            <Stat label="Best" value={`${Math.round(best)}%`} />
          </div>
        </div>
      </header>

      {err && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Could not load your results: {err}
        </div>
      )}

      {attempts.length === 0 && !err && (
        <div className="rounded-2xl border border-dashed px-6 py-12 text-center bg-card">
          <Trophy className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No exam attempts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Take your first exam, then come back here to see your performance.</p>
          <Link to="/student" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Go to exams <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      <div className="grid gap-3">
        {attempts.map((a) => {
          const pct = a.totalPossible ? Math.round(((a.score ?? 0) / a.totalPossible) * 100) : 0;
          return (
            <Link
              key={a.id}
              to="/student/exam/$sessionId/result"
              params={{ sessionId: a.sessionId }}
              className="group rounded-2xl border bg-card p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${a.submitted ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {a.submitted ? "Submitted" : "In progress"}
                    </span>
                    {a.autoSubmitted && (
                      <span className="text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">Auto</span>
                    )}
                  </div>
                  <div className="font-semibold group-hover:text-primary transition-colors">Session {a.sessionId.slice(0, 8)}…</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="size-3.5" />
                    {a.startedAt?.toDate?.().toLocaleString?.() ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  {a.submitted ? (
                    <>
                      <div className="text-2xl font-bold">{a.score}<span className="text-base text-muted-foreground">/{a.totalPossible}</span></div>
                      <div className={`text-sm font-medium ${pct >= 50 ? "text-primary" : "text-secondary"}`}>{pct}%</div>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Continue →</span>
                  )}
                </div>
              </div>
              {a.breakdown && Object.keys(a.breakdown).length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(a.breakdown).map(([subj, b]) => {
                    const sp = b.total ? Math.round((b.score / b.total) * 100) : 0;
                    return (
                      <div key={subj} className="rounded-lg bg-muted/60 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{subj}</div>
                        <div className="text-sm font-semibold">{b.score}/{b.total} · {sp}%</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 text-center ${accent ? "border-primary/30 bg-primary/5" : "bg-muted/40"}`}>
      <div className={`text-lg font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
