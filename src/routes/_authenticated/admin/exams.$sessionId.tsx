import { createFileRoute, Link, Navigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, collection, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Attempt, ExamSession } from "@/lib/exams";
import { computeStatus } from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/exams/$sessionId")({
  component: SessionDetail,
});

function SessionDetail() {
  const { profile } = useAuth();
  if (profile && profile.role === "student") return <Navigate to="/student" />;

  const { sessionId } = useParams({ from: "/_authenticated/admin/exams/$sessionId" });
  const [session, setSession] = useState<ExamSession | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

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

  if (!session) return <div className="text-muted-foreground">Loading…</div>;

  const status = computeStatus(session);

  async function setStatus(s: ExamSession["status"]) {
    try {
      await updateDoc(doc(getDb(), "examSessions", sessionId), { status: s });
      toast.success("Updated");
    } catch (e: any) { toast.error(e.message); }
  }

  const sorted = [...attempts].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/exams" className="text-sm text-muted-foreground hover:underline">← All exams</Link>
        <h1 className="text-2xl font-bold mt-2">{session.title}</h1>
        <p className="text-sm text-muted-foreground">
          {session.subject} · {session.questionIds.length} questions · {session.durationMinutes} min · starts {session.startAt.toDate().toLocaleString()}
        </p>
        <p className="text-sm mt-2">Status: <span className="font-medium">{status}</span></p>
      </div>

      <div className="flex flex-wrap gap-2">
        {status === "ended" && session.status !== "corrections_open" && (
          <Button onClick={() => setStatus("corrections_open")}>Release corrections</Button>
        )}
        {session.status === "corrections_open" && (
          <Button variant="outline" onClick={() => setStatus("ended")}>Hide corrections</Button>
        )}
      </div>

      <div className="rounded-lg border">
        <div className="p-4 border-b font-semibold">Scoreboard ({attempts.length})</div>
        <div className="divide-y">
          {sorted.length === 0 && <p className="p-4 text-sm text-muted-foreground">No attempts yet.</p>}
          {sorted.map((a, i) => (
            <div key={a.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">#{i + 1} {a.studentName}</div>
                <div className="text-muted-foreground text-xs">
                  {a.studentIdShort ?? a.uid.slice(0, 6)} · {a.submitted ? (a.autoSubmitted ? "auto-submitted" : "submitted") : "in progress"}
                </div>
              </div>
              <div className="font-mono">
                {a.submitted ? `${a.score}/${a.totalPossible}` : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
