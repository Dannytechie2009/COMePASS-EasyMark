import { Spinner } from "@/components/Spinner";
import { createFileRoute, Link, Navigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, collection, query, where } from "firebase/firestore";
import { CheckCircle2, EyeOff, Eye } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Attempt, ExamSession } from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/exams/$sessionId/corrections")({
  component: CorrectionsPage,
});

function CorrectionsPage() {
  const { profile } = useAuth();
  if (profile && profile.role === "student") return <Navigate to="/student" />;

  const { sessionId } = useParams({ from: "/_authenticated/admin/exams/$sessionId/corrections" });
  const [session, setSession] = useState<ExamSession | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub1 = onSnapshot(doc(getDb(), "examSessions", sessionId), (s) => {
      if (!s.exists()) setSession(null);
      else setSession({ id: s.id, ...(s.data() as any) });
    });
    const unsub2 = onSnapshot(
      query(collection(getDb(), "attempts"), where("sessionId", "==", sessionId)),
      (snap) => setAttempts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
    );
    return () => { unsub1(); unsub2(); };
  }, [sessionId]);

  if (!session) return <Spinner label="Loading…" />;

  const released = session.status === "corrections_open";

  async function toggle(next: ExamSession["status"]) {
    setBusy(true);
    try {
      await updateDoc(doc(getDb(), "examSessions", sessionId), { status: next });
      toast.success(next === "corrections_open" ? "Corrections released to students" : "Corrections hidden from students");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const submitted = attempts.filter((a) => a.submitted);
  const sorted = [...submitted].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/exams/$sessionId" params={{ sessionId }} className="text-sm text-muted-foreground hover:underline">
          ← Back to exam
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-2">Corrections — {session.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review each student's answers and explanations, and control whether students can see their corrections.
        </p>
      </div>

      {/* Dedicated release control */}
      <div className={`rounded-2xl border p-5 shadow-sm ${released ? "border-green-500/40 bg-green-500/5" : "bg-card"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 size-9 rounded-full flex items-center justify-center ${released ? "bg-green-500/20 text-green-700 dark:text-green-300" : "bg-muted text-muted-foreground"}`}>
              {released ? <CheckCircle2 className="size-5" /> : <EyeOff className="size-5" />}
            </div>
            <div>
              <h2 className="font-semibold">
                {released ? "Corrections are LIVE for students" : "Corrections are hidden from students"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                {released
                  ? "Students can now open their result page and view every question, their answer, the correct answer and the explanation."
                  : "Students can see their score but cannot see the correct answers or explanations until you release corrections."}
              </p>
            </div>
          </div>
          <div>
            {released ? (
              <Button variant="outline" disabled={busy} onClick={() => toggle("ended")}>
                <EyeOff className="size-4 mr-2" /> Hide corrections
              </Button>
            ) : (
              <Button disabled={busy} onClick={() => toggle("corrections_open")}>
                <Eye className="size-4 mr-2" /> Release corrections to students
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-4 border-b font-semibold">
          Student attempts ({submitted.length})
        </div>
        <div className="divide-y">
          {sorted.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No submitted attempts yet.</p>
          )}
          {sorted.map((a, i) => {
            const pct = a.totalPossible ? Math.round(((a.score ?? 0) / a.totalPossible) * 100) : 0;
            return (
              <Link
                key={a.id}
                to="/admin/exams/$sessionId/attempts/$uid"
                params={{ sessionId, uid: a.uid }}
                className="p-4 flex items-center justify-between text-sm gap-3 hover:bg-accent transition-colors"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="shrink-0 size-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
                    #{i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.studentName}</div>
                    <div className="text-muted-foreground text-xs truncate">
                      {a.studentIdShort ?? a.uid.slice(0, 6)} · {a.autoSubmitted ? "auto-submitted" : "submitted"}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono">{a.score}/{a.totalPossible}</div>
                  <div className="text-xs text-muted-foreground">{pct}% · View corrections →</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
