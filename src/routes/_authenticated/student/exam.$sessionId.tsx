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
  formatRemaining,
  shuffle,
  type Attempt,
  type ExamSession,
  type Question,
} from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
        // create attempt
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
        };
        await setDoc(aref, newAttempt);
        const created = await getDoc(aref);
        attemptData = { id: created.id, ...(created.data() as any) };
      }
      setAttempt(attemptData);

      // Fetch questions in order. Firestore `in` allows up to 30 ids per query.
      const ids = attemptData.questionOrder;
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
      const fetched: Record<string, Question> = {};
      for (const c of chunks) {
        const snap = await getDocs(query(collection(db, "questions"), where(documentId(), "in", c)));
        for (const d of snap.docs) fetched[d.id] = { id: d.id, ...(d.data() as any) };
      }
      setQuestions(ids.map((id) => fetched[id]).filter(Boolean));
      setLoading(false);
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

  const status = computeStatus(session);

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
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{session.title}</h1>
        <p className="text-muted-foreground">{session.subject} · {session.durationMinutes} min</p>
        <div className="rounded-lg border p-6 text-center">
          <p className="text-sm text-muted-foreground">Starts in</p>
          <p className="text-4xl font-mono mt-2">{formatRemaining(ms)}</p>
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
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-background/95 backdrop-blur border-b flex items-center justify-between">
        <div>
          <div className="font-semibold">{session.title}</div>
          <div className="text-xs text-muted-foreground">{answered}/{questions.length} answered</div>
        </div>
        <div className={`font-mono text-lg ${remaining < 60_000 ? "text-red-600" : ""}`}>
          {formatRemaining(remaining)}
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => {
          const optOrder = attempt.optionOrder?.[q.id] ?? [0, 1, 2, 3];
          const chosen = attempt.answers[q.id];
          return (
            <div key={q.id} className="rounded-lg border p-5 space-y-3">
              <div className="text-sm text-muted-foreground">Question {idx + 1}</div>
              <div className="font-medium whitespace-pre-wrap">{q.text}</div>
              {q.imageUrl && <img src={q.imageUrl} alt="" className="max-h-64 rounded border" />}
              <div className="space-y-2">
                {optOrder.map((origIdx, displayIdx) => (
                  <label
                    key={origIdx}
                    className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer text-sm transition-colors ${
                      chosen === origIdx ? "bg-primary/10 border-primary" : "hover:bg-accent"
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

      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-background/95 backdrop-blur border-t flex justify-end">
        <Button size="lg" onClick={() => submit(false)}>Submit exam</Button>
      </div>
    </div>
  );
}
