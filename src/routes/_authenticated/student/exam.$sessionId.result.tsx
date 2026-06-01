import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  documentId,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { attemptId, type Attempt, type ExamSession, type Question } from "@/lib/exams";

export const Route = createFileRoute("/_authenticated/student/exam/$sessionId/result")({
  component: ResultPage,
});

function ResultPage() {
  const { profile } = useAuth();
  const { sessionId } = useParams({ from: "/_authenticated/student/exam/$sessionId/result" });
  const [session, setSession] = useState<ExamSession | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Record<string, Question>>({});

  useEffect(() => {
    return onSnapshot(doc(getDb(), "examSessions", sessionId), (s) => {
      if (s.exists()) setSession({ id: s.id, ...(s.data() as any) });
    });
  }, [sessionId]);

  useEffect(() => {
    if (!profile) return;
    return onSnapshot(doc(getDb(), "attempts", attemptId(sessionId, profile.uid)), (s) => {
      if (s.exists()) setAttempt({ id: s.id, ...(s.data() as any) });
    });
  }, [profile, sessionId]);

  useEffect(() => {
    if (!attempt || !session || session.status !== "corrections_open") return;
    (async () => {
      const ids = attempt.questionOrder;
      const map: Record<string, Question> = {};
      for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30);
        const snap = await getDocs(query(collection(getDb(), "questions"), where(documentId(), "in", chunk)));
        for (const d of snap.docs) map[d.id] = { id: d.id, ...(d.data() as any) };
      }
      setQuestions(map);
    })();
  }, [attempt, session]);

  if (!session || !attempt) return <div className="text-muted-foreground">Loading…</div>;
  if (!attempt.submitted) return <div>You haven't submitted this exam yet.</div>;

  const pct = attempt.totalPossible ? Math.round(((attempt.score ?? 0) / attempt.totalPossible) * 100) : 0;
  const correctionsOpen = session.status === "corrections_open";

  return (
    <div className="space-y-6">
      <div>
        <Link to="/student" className="text-sm text-muted-foreground hover:underline">← Back</Link>
        <h1 className="text-2xl font-bold mt-2">{session.title} — Result</h1>
      </div>

      <div className="rounded-2xl border border-border/70 p-6 text-center bg-card shadow-sm">
        <p className="text-sm text-muted-foreground">Your score</p>
        <p className="text-5xl font-bold mt-2">{attempt.score}<span className="text-2xl text-muted-foreground">/{attempt.totalPossible}</span></p>
        <p className="text-muted-foreground mt-2">{pct}%</p>
      </div>

      {attempt.breakdown && Object.keys(attempt.breakdown).length > 1 && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <h3 className="font-semibold mb-3">Subject breakdown</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(attempt.breakdown).map(([subj, b]) => {
              const sp = b.total ? Math.round((b.score / b.total) * 100) : 0;
              return (
                <div key={subj} className="rounded-xl bg-muted/60 p-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{subj}</span>
                    <span>{b.score}/{b.total} · {sp}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-background overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${sp}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!correctionsOpen && (
        <p className="text-sm text-muted-foreground text-center">
          Corrections will appear here once your tutor releases them.
        </p>
      )}

      {correctionsOpen && (
        <div className="space-y-4">
          <h2 className="font-semibold">Corrections</h2>
          {attempt.questionOrder.map((qid, idx) => {
            const q = questions[qid];
            if (!q) return null;
            const chosen = attempt.answers[qid];
            const correct = q.correctIndex;
            const got = chosen === correct;
            return (
              <div key={qid} className="rounded-lg border p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Question {idx + 1} {got ? "✓" : "✗"}</div>
                <div className="font-medium whitespace-pre-wrap">{q.text}</div>
                {q.imageUrl && <img src={q.imageUrl} alt="" className="max-h-48 rounded border" />}
                <ul className="text-sm space-y-1">
                  {q.options.map((o, i) => {
                    const isChosen = chosen === i;
                    const isCorrect = correct === i;
                    return (
                      <li
                        key={i}
                        className={
                          isCorrect
                            ? "text-green-600 dark:text-green-400 font-medium"
                            : isChosen
                              ? "text-red-600 dark:text-red-400"
                              : ""
                        }
                      >
                        {"ABCD"[i]}. {o} {isCorrect && "✓"} {isChosen && !isCorrect && "(your answer)"}
                      </li>
                    );
                  })}
                </ul>
                {q.explanation && (
                  <p className="text-sm text-muted-foreground border-l-2 pl-3 mt-2">{q.explanation}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
