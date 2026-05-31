import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
  collection,
  query,
  where,
  documentId,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  attemptId,
  computeStatus,
  formatDurationFromMs,
  formatRemaining,
  getSessionSubjects,
  shuffle,
  type Attempt,
  type ExamSession,
  type Question,
} from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Clock3, KeyRound, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student/exam/$sessionId")({
  component: TakeExam,
});

function TakeExam() {
  const { profile, user } = useAuth();
  const { sessionId } = useParams({ from: "/_authenticated/student/exam/$sessionId" });
  const nav = useNavigate();

  const [session, setSession] = useState<ExamSession | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  // Subscribe to session
  useEffect(() => {
    return onSnapshot(doc(getDb(), "examSessions", sessionId), (s) => {
      if (!s.exists()) { setSession(null); setLoading(false); return; }
      setSession({ id: s.id, ...(s.data() as any) });
    });
  }, [sessionId]);

  // Load or create attempt + questions
  useEffect(() => {
    if (!session || !profile || !user) return;
    if (!user.emailVerified) { setLoading(false); return; }
    (async () => {
      setLoadError(null);
      try {
        const db = getDb();
        const aid = attemptId(sessionId, profile.uid);
        const aref = doc(db, "attempts", aid);
        const asnap = await getDoc(aref);
        let attemptData: Attempt;
        const status = computeStatus(session);

        if (asnap.exists()) {
          attemptData = { id: asnap.id, ...(asnap.data() as any) };
        } else {
          if (status !== "live") { setLoading(false); return; }
          const order = session.shuffleQuestions ? shuffle(session.questionIds) : [...session.questionIds];
          const optionOrder: Record<string, number[]> = {};
          if (session.shuffleOptions) for (const qid of order) optionOrder[qid] = shuffle([0, 1, 2, 3]);
          const newAttempt = {
            sessionId,
            uid: profile.uid,
            studentName: profile.name,
            studentIdShort: profile.studentId ?? null,
            startedAt: serverTimestamp(),
            answers: {},
            questionOrder: order,
            optionOrder: session.shuffleOptions ? optionOrder : null,
            submitted: false,
            productKeyUsed: null,
          };
          await setDoc(aref, newAttempt);
          const created = await getDoc(aref);
          attemptData = { id: created.id, ...(created.data() as any) };
        }
        setAttempt(attemptData);

        const ids = attemptData.questionOrder;
        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
        const fetched: Record<string, Question> = {};
        for (const c of chunks) {
          const snap = await getDocs(query(collection(db, "questions"), where(documentId(), "in", c)));
          for (const d of snap.docs) fetched[d.id] = { id: d.id, ...(d.data() as any) };
        }
        setQuestions(ids.map((id) => fetched[id]).filter(Boolean));
      } catch (error: any) {
        console.error("Failed to prepare exam", error);
        setLoadError(error?.message ?? "Unable to prepare exam");
      } finally {
        setLoading(false);
      }
    })();
  }, [session, profile, user, sessionId]);

  // Tick timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const deadlineMs = useMemo(() => {
    if (!attempt || !session) return null;
    const start = (attempt.startedAt as Timestamp | undefined)?.toMillis?.() ?? Date.now();
    return start + session.durationMinutes * 60_000;
  }, [attempt, session]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (!attempt || attempt.submitted || !deadlineMs) return;
    if (now >= deadlineMs && !submittingRef.current) {
      void submit(true);
    }
  }, [now, deadlineMs, attempt]);

  async function answer(qid: string, choice: number) {
    if (!attempt || attempt.submitted) return;
    const next = { ...attempt.answers, [qid]: choice };
    setAttempt({ ...attempt, answers: next });
    try {
      await updateDoc(doc(getDb(), "attempts", attempt.id), { [`answers.${qid}`]: choice });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function submit(auto = false) {
    if (!attempt || attempt.submitted || submittingRef.current) return;
    if (!auto && !confirm("Submit your exam? You can't change answers after this.")) return;
    submittingRef.current = true;
    try {
      // Score
      let score = 0;
      for (const q of questions) {
        if (attempt.answers[q.id] === q.correctIndex) score++;
      }
      await updateDoc(doc(getDb(), "attempts", attempt.id), {
        submitted: true,
        autoSubmitted: auto,
        endedAt: serverTimestamp(),
        score,
        totalPossible: questions.length,
      });
      toast.success(auto ? "Time up — submitted automatically" : "Submitted");
      nav({ to: "/student/exam/$sessionId/result", params: { sessionId } });
    } catch (e: any) {
      toast.error(e.message);
      submittingRef.current = false;
    }
  }

  if (loading) return <div className="text-muted-foreground">Loading exam…</div>;
  if (!session) return <div>Exam not found.</div>;
  if (!user?.emailVerified) return <div>Please verify your email before taking exams.</div>;
  if (loadError) {
    return (
      <div className="space-y-4 rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">We couldn't open this exam yet</h1>
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Retry</Button>
          <Button asChild variant="outline"><Link to="/student">Back to dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const status = computeStatus(session);
  const sessionSubjects = getSessionSubjects(session);

  if (attempt?.submitted) {
    return (
      <div className="space-y-4">
        <p>You've already submitted this exam.</p>
        <Button asChild><Link to="/student/exam/$sessionId/result" params={{ sessionId }}>View result</Link></Button>
      </div>
    );
  }

  if (status === "scheduled") {
    const ms = session.startAt.toMillis() - now;
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Link to="/student" className="text-sm text-muted-foreground hover:underline">← Back to dashboard</Link>
          <h1 className="text-3xl font-semibold">{session.title}</h1>
          <p className="text-sm text-muted-foreground">{sessionSubjects.join(" • ")} · {formatDurationFromMs(session.durationMinutes * 60_000)}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Starts in</p>
            <p className="mt-3 font-mono text-5xl font-semibold">{formatRemaining(ms)}</p>
            <p className="mt-4 text-sm text-muted-foreground">The exam window opens automatically at the scheduled start time.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <div className="space-y-3 text-sm text-muted-foreground">
              <InfoRow icon={Clock3} label="Duration" value={formatDurationFromMs(session.durationMinutes * 60_000)} />
              <InfoRow icon={ShieldCheck} label="Answers save" value="Continuously while you work" />
              <InfoRow icon={KeyRound} label="Access" value={session.requiresProductKey ? "Product key required" : "Direct access"} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "ended" && !attempt) {
    return <div>This exam has ended.</div>;
  }

  if (!attempt) return <div className="text-muted-foreground">Preparing…</div>;

  const remaining = deadlineMs! - now;
  const answered = Object.keys(attempt.answers).length;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur">
        <div>
          <div className="font-semibold">{session.title}</div>
          <div className="text-xs text-muted-foreground">{answered}/{questions.length} answered</div>
        </div>
        <div className={`font-mono text-lg ${remaining < 60_000 ? "text-red-600" : ""}`}>
          {formatRemaining(remaining)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="space-y-6">
        {questions.map((q, idx) => {
          const optOrder = attempt.optionOrder?.[q.id] ?? [0, 1, 2, 3];
          const chosen = attempt.answers[q.id];
          return (
            <div key={q.id} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
              <div className="text-sm text-muted-foreground">Question {idx + 1}</div>
              <div className="font-medium whitespace-pre-wrap">{q.text}</div>
              {q.imageUrl && <img src={q.imageUrl} alt="Question illustration" className="max-h-64 rounded-xl border border-border/70" />}
              <div className="space-y-2">
                {optOrder.map((origIdx, displayIdx) => (
                  <label
                    key={origIdx}
                    className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer text-sm transition-colors ${
                      chosen === origIdx ? "border-primary bg-primary/10" : "border-border/70 hover:bg-muted/70"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={chosen === origIdx}
                      onChange={() => answer(q.id, origIdx)}
                    />
                    <span className="font-medium text-muted-foreground w-6">{"ABCD"[displayIdx]}.</span>
                    <span>{q.options[origIdx]}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle2 className="size-4 text-secondary" />
              Progress tracker
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5">
              {questions.map((question, index) => {
                const done = attempt.answers[question.id] !== undefined;
                return (
                  <div
                    key={question.id}
                    className={`grid aspect-square place-items-center rounded-xl text-xs font-medium ${
                      done ? "bg-secondary/15 text-secondary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-background/95 backdrop-blur border-t flex justify-end">
        <Button size="lg" onClick={() => submit(false)}>Submit exam</Button>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <span>{label}</span>
      </div>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
