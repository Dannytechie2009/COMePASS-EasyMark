import { Spinner } from "@/components/Spinner";
import { createFileRoute, Link, Navigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, updateDoc, collection, query, where, orderBy, limit } from "firebase/firestore";
import { AlertTriangle, Radio } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Attempt, ExamSession } from "@/lib/exams";
import { computeStatus, formatRemaining, getSessionSubjects } from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/exams/$sessionId")({
  component: SessionDetail,
});

interface KeyDoc {
  id: string;
  value: string;
  used: boolean;
  usedBy?: string | null;
  usedAt?: any;
}

function SessionDetail() {
  const { profile } = useAuth();
  if (profile && profile.role === "student") return <Navigate to="/student" />;

  const { sessionId } = useParams({ from: "/_authenticated/admin/exams/$sessionId" });
  const [session, setSession] = useState<ExamSession | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [keys, setKeys] = useState<KeyDoc[]>([]);
  const [violations, setViolations] = useState<Array<{ id: string; uid: string; studentName: string; kind: string; at?: any }>>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const unsub1 = onSnapshot(doc(getDb(), "examSessions", sessionId), (s) => {
      if (!s.exists()) setSession(null);
      else setSession({ id: s.id, ...(s.data() as any) });
    });
    const unsub2 = onSnapshot(
      query(collection(getDb(), "attempts"), where("sessionId", "==", sessionId)),
      (snap) => setAttempts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    );
    const unsub3 = onSnapshot(
      collection(getDb(), "examSessions", sessionId, "productKeys"),
      (snap) => setKeys(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    );
    const unsub4 = onSnapshot(
      query(collection(getDb(), "examSessions", sessionId, "violations"), orderBy("at", "desc"), limit(50)),
      (snap) => setViolations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      () => { /* ignore if none yet */ },
    );
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [sessionId]);

  if (!session) return <Spinner label="Loading…" />;

  const status = computeStatus(session);

  async function setStatus(s: ExamSession["status"]) {
    try {
      await updateDoc(doc(getDb(), "examSessions", sessionId), { status: s });
      toast.success("Updated");
    } catch (e: any) { toast.error(e.message); }
  }

  const sorted = [...attempts].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const usedKeys = keys.filter((k) => k.used).length;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/exams" className="text-sm text-muted-foreground hover:underline">← All exams</Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-2">{session.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {getSessionSubjects(session).join(" + ")} · {session.questionIds.length} questions · {session.durationMinutes} min
        </p>
        <p className="text-xs text-muted-foreground">Starts {session.startAt.toDate().toLocaleString()}</p>
        <p className="text-sm mt-2">Status: <span className="font-medium">{status}</span></p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/admin/exams/$sessionId/questions" params={{ sessionId }}>View assigned questions</Link>
        </Button>
        <Button asChild>
          <Link to="/admin/exams/$sessionId/corrections" params={{ sessionId }}>Open corrections page</Link>
        </Button>
        {session.status !== "corrections_open" ? (
          <Button variant="outline" onClick={() => setStatus("corrections_open")}>
            Release corrections
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setStatus("ended")}>Hide corrections</Button>
        )}
      </div>

      {session.status === "corrections_open" && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-800 dark:text-green-300">
          ✓ Corrections are live — students can now view every question, correct answer and explanation on their result page.
        </div>
      )}

      {session.requiresProductKey && (
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="p-4 border-b flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Product keys (PINs)</h2>
              <p className="text-xs text-muted-foreground">
                Mode: <span className="font-medium">{session.keyMode ?? "shared"}</span>
                {session.keyMode === "individual" && ` · ${usedKeys}/${keys.length} used`}
              </p>
            </div>
            {(session.keyMode ?? "shared") === "shared" && (
              <div className="font-mono text-sm bg-muted px-3 py-1.5 rounded-md tracking-wider">
                {session.productKey}
              </div>
            )}
          </div>

          {session.keyMode === "individual" && (
            <div className="p-4">
              <div className="flex justify-end mb-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const txt = keys
                      .map((k) => `${k.value}\t${k.used ? "USED" : "AVAILABLE"}`)
                      .join("\n");
                    navigator.clipboard.writeText(txt);
                    toast.success("PINs copied");
                  }}
                >Copy all</Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-auto">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className={`rounded-md border px-3 py-2 text-sm font-mono tracking-wider ${
                      k.used ? "bg-muted text-muted-foreground line-through" : "bg-background"
                    }`}
                    title={k.used ? `Used by ${k.usedBy ?? ""}` : "Available"}
                  >
                    {k.value}
                  </div>
                ))}
                {keys.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No PINs generated yet.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live monitoring */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <Radio className="size-4 text-green-600 animate-pulse" />
          <h2 className="font-semibold">Live monitoring</h2>
          <span className="text-xs text-muted-foreground ml-auto">Auto-refreshing</span>
        </div>
        <div className="divide-y">
          {attempts.filter((a) => !a.submitted).length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No students currently writing.</p>
          )}
          {attempts.filter((a) => !a.submitted).map((a) => {
            const start = a.startedAt?.toMillis?.() ?? now;
            const deadline = start + session.durationMinutes * 60_000;
            const left = Math.max(0, deadline - now);
            const answered = Object.keys(a.answers ?? {}).length;
            const progress = Math.round((answered / session.questionIds.length) * 100);
            const flags = violations.filter((v) => v.uid === a.uid).length;
            return (
              <div key={a.id} className="p-4 grid gap-2 sm:grid-cols-[1fr_auto] items-center">
                <div>
                  <div className="font-medium text-sm">{a.studentName}</div>
                  <div className="text-xs text-muted-foreground">
                    {answered}/{session.questionIds.length} answered · {progress}%
                    {flags > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="size-3" /> {flags} flag{flags === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-sm ${left < 60_000 ? "text-red-600" : ""}`}>{formatRemaining(left)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">time left</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent alerts */}
      {violations.length > 0 && (
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="p-4 border-b font-semibold flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" /> Suspicious activity ({violations.length})
          </div>
          <div className="divide-y max-h-80 overflow-auto">
            {violations.map((v) => (
              <div key={v.id} className="p-3 text-sm flex items-center justify-between gap-3">
                <div>
                  <span className="font-medium">{v.studentName}</span>{" "}
                  <span className="text-muted-foreground">— {v.kind.replace(/_/g, " ")}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {v.at?.toDate?.().toLocaleTimeString?.() ?? ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-4 border-b font-semibold">Scoreboard ({attempts.length})</div>
        <div className="divide-y">
          {sorted.length === 0 && <p className="p-4 text-sm text-muted-foreground">No attempts yet.</p>}
          {sorted.map((a, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
            const pct = a.submitted && a.totalPossible ? Math.round(((a.score ?? 0) / a.totalPossible) * 100) : null;
            return (
              <Link
                key={a.id}
                to="/admin/exams/$sessionId/attempts/$uid"
                params={{ sessionId, uid: a.uid }}
                className="p-4 flex items-center justify-between text-sm gap-3 hover:bg-accent transition-colors"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className={`shrink-0 size-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-yellow-400/20 text-yellow-700 dark:text-yellow-300" :
                    i === 1 ? "bg-slate-400/20 text-slate-700 dark:text-slate-300" :
                    i === 2 ? "bg-amber-600/20 text-amber-700 dark:text-amber-300" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {medal ?? `#${i + 1}`}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.studentName}</div>
                    <div className="text-muted-foreground text-xs truncate">
                      {a.studentIdShort ?? a.uid.slice(0, 6)} · {a.submitted ? (a.autoSubmitted ? "auto-submitted" : "submitted") : "in progress"}
                      {a.productKeyUsed && ` · PIN ${a.productKeyUsed}`}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono">{a.submitted ? `${a.score}/${a.totalPossible}` : "—"}</div>
                  {pct !== null && <div className="text-xs text-muted-foreground">{pct}%</div>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
