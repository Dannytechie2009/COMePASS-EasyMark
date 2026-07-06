import { Spinner } from "@/components/Spinner";
import { createFileRoute, Link, useParams, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  documentId,
} from "firebase/firestore";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { attemptId, type Attempt, type ExamSession, type Question } from "@/lib/exams";

export const Route = createFileRoute("/_authenticated/student/exam/$sessionId/corrections")({
  component: CorrectionsPage,
});

function CorrectionsPage() {
  const { profile } = useAuth();
  const { sessionId } = useParams({ from: "/_authenticated/student/exam/$sessionId/corrections" });
  const [session, setSession] = useState<ExamSession | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Record<string, Question>>({});
  const [loadingQs, setLoadingQs] = useState(true);

  useEffect(() => {
    return onSnapshot(doc(getDb(), "examSessions", sessionId), (s) => {
      if (s.exists()) setSession({ id: s.id, ...(s.data() as any) });
      else setSession(null);
    });
  }, [sessionId]);

  useEffect(() => {
    if (!profile) return;
    return onSnapshot(doc(getDb(), "attempts", attemptId(sessionId, profile.uid)), (s) => {
      if (s.exists()) setAttempt({ id: s.id, ...(s.data() as any) });
      else setAttempt(null);
    });
  }, [profile, sessionId]);

  useEffect(() => {
    if (!attempt) return;
    setLoadingQs(true);
    (async () => {
      const ids = attempt.questionOrder;
      const map: Record<string, Question> = {};
      for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30);
        if (chunk.length === 0) continue;
        const snap = await getDocs(query(collection(getDb(), "questions"), where(documentId(), "in", chunk)));
        for (const d of snap.docs) map[d.id] = { id: d.id, ...(d.data() as any) };
      }
      setQuestions(map);
      setLoadingQs(false);
    })();
  }, [attempt]);

  if (!session) return <Spinner label="Loading corrections…" />;

  // Gate on release status.
  if (session.status !== "corrections_open") {
    return (
      <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <Link to="/student/exam/$sessionId/result" params={{ sessionId }} className="text-sm text-muted-foreground hover:underline">← Back to result</Link>
        <h1 className="text-2xl font-semibold">{session.title} — Corrections</h1>
        <p className="text-sm text-muted-foreground">
          Corrections haven't been released yet. Once your tutor releases them, this page will show every question with the correct answer and explanation.
        </p>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
        <Link to="/student" className="text-sm text-muted-foreground hover:underline">← Back</Link>
        <h1 className="text-2xl font-semibold">{session.title} — Corrections</h1>
        <p className="text-sm text-muted-foreground">You don't have an attempt on record for this exam.</p>
      </div>
    );
  }

  if (!attempt.submitted) return <Navigate to="/student/exam/$sessionId/result" params={{ sessionId }} />;

  if (loadingQs) return <Spinner label="Loading questions…" />;

  const total = attempt.questionOrder.length;
  const correctCount = attempt.questionOrder.filter((qid) => {
    const q = questions[qid];
    return q && attempt.answers[qid] === q.correctIndex;
  }).length;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/student/exam/$sessionId/result" params={{ sessionId }} className="text-sm text-muted-foreground hover:underline">← Back to result</Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-2">{session.title} — Corrections</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {correctCount} correct out of {total} · Review every question below.
        </p>
      </div>

      <div className="space-y-4">
        {attempt.questionOrder.map((qid, idx) => {
          const q = questions[qid];
          if (!q) return null;
          const chosen = attempt.answers[qid];
          const correct = q.correctIndex;
          const answered = typeof chosen === "number";
          const got = chosen === correct;
          return (
            <div
              key={qid}
              className={`rounded-2xl border p-5 shadow-sm ${got ? "border-green-500/30 bg-green-500/5" : "border-red-500/20 bg-card"}`}
            >
              <div className="flex items-center justify-between gap-2 text-xs mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Question {idx + 1} of {total}</span>
                  {q.topicTitle && (
                    <span className="uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{q.topicTitle}</span>
                  )}
                  <span className="text-muted-foreground">· {q.subject}</span>
                </div>
                {got ? (
                  <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 font-medium"><CheckCircle2 className="size-4" /> Correct</span>
                ) : answered ? (
                  <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium"><XCircle className="size-4" /> Incorrect</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Not answered</span>
                )}
              </div>

              <p className="font-medium whitespace-pre-wrap">{q.text}</p>
              {q.imageUrl && <img src={q.imageUrl} alt="" className="mt-3 max-h-64 rounded border" />}

              <ul className="mt-4 space-y-2 text-sm">
                {q.options.map((o, i) => {
                  const isChosen = chosen === i;
                  const isCorrect = correct === i;
                  const cls = isCorrect
                    ? "border-green-500/50 bg-green-500/10 text-green-800 dark:text-green-300"
                    : isChosen
                      ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300"
                      : "border-border/60 bg-background";
                  return (
                    <li key={i} className={`rounded-lg border px-3 py-2 flex items-start gap-2 ${cls}`}>
                      <span className="font-mono font-semibold">{"ABCD"[i]}.</span>
                      <span className="flex-1">{o}</span>
                      {isCorrect && <span className="text-xs font-medium">Correct answer</span>}
                      {isChosen && !isCorrect && <span className="text-xs font-medium">Your answer</span>}
                    </li>
                  );
                })}
              </ul>

              {q.explanation && (
                <div className="mt-4 rounded-lg bg-muted/60 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    <Lightbulb className="size-3.5" /> Explanation
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
