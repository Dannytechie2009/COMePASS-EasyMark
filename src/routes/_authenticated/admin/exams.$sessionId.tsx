import { createFileRoute, Link, Navigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, collection, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Attempt, ExamSession } from "@/lib/exams";
import { computeStatus, getSessionSubjects } from "@/lib/exams";
import { listenReviewsForSession, type Review } from "@/lib/reviews";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
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
  const [reviews, setReviews] = useState<Review[]>([]);

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
    const unsub4 = listenReviewsForSession(sessionId, setReviews);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
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
  const usedKeys = keys.filter((k) => k.used).length;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/exams" className="text-sm text-muted-foreground hover:underline">← All exams</Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-2">{session.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {getSessionSubjects(session).join(" + ")} · {session.questionIds.length} questions · {session.durationMinutes} min per student
        </p>
        <p className="text-xs text-muted-foreground">
          Starts {session.startAt.toDate().toLocaleString()}
          {session.availabilityMinutes && (
            <> · open for {session.availabilityMinutes} min (closes {new Date(session.startAt.toMillis() + session.availabilityMinutes * 60_000).toLocaleString()})</>
          )}
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

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-4 border-b font-semibold">Scoreboard ({attempts.length})</div>
        <div className="divide-y">
          {sorted.length === 0 && <p className="p-4 text-sm text-muted-foreground">No attempts yet.</p>}
          {sorted.map((a, i) => (
            <div key={a.id} className="p-4 flex items-center justify-between text-sm gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">#{i + 1} {a.studentName}</div>
                <div className="text-muted-foreground text-xs truncate">
                  {a.studentIdShort ?? a.uid.slice(0, 6)} · {a.submitted ? (a.autoSubmitted ? "auto-submitted" : "submitted") : "in progress"}
                  {a.productKeyUsed && ` · PIN ${a.productKeyUsed}`}
                </div>
              </div>
              <div className="font-mono shrink-0">
                {a.submitted ? `${a.score}/${a.totalPossible}` : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Student reviews ({reviews.length})</h2>
            <p className="text-xs text-muted-foreground">
              Average rating: {reviews.length
                ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
                : "—"} / 5
            </p>
          </div>
          <Star className="size-5 text-amber-500" fill="currentColor" />
        </div>
        <div className="divide-y">
          {reviews.length === 0 && <p className="p-4 text-sm text-muted-foreground">No reviews yet.</p>}
          {reviews.map((r) => (
            <div key={r.id} className="p-4 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{r.studentName}</span>
                <span className="flex items-center gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-3.5" fill={i < r.rating ? "currentColor" : "none"} />
                  ))}
                </span>
              </div>
              {r.comment && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
