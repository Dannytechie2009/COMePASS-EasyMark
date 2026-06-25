import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  documentId,
} from "firebase/firestore";
import { TrendingUp, TrendingDown, Lightbulb, Trophy } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { attemptId, type Attempt, type ExamSession, type Question } from "@/lib/exams";
import { fetchTopicsBySubject, type Topic } from "@/lib/syllabus";

export const Route = createFileRoute("/_authenticated/student/exam/$sessionId/result")({
  component: ResultPage,
});

interface TopicStat {
  topicId: string;
  topicTitle: string;
  subject: string;
  correct: number;
  total: number;
  pct: number;
  tip?: string;
  description?: string;
}

function ResultPage() {
  const { profile } = useAuth();
  const { sessionId } = useParams({ from: "/_authenticated/student/exam/$sessionId/result" });
  const [session, setSession] = useState<ExamSession | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Record<string, Question>>({});
  const [topicsBySubject, setTopicsBySubject] = useState<Record<string, Topic[]>>({});

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

  // Always load questions so we can compute topic insights even before corrections.
  useEffect(() => {
    if (!attempt) return;
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
  }, [attempt]);

  // Pull syllabus for the subjects in this exam.
  useEffect(() => {
    const subjects = Array.from(new Set(Object.values(questions).map((q) => q.subject)));
    if (subjects.length === 0) return;
    (async () => {
      const out: Record<string, Topic[]> = {};
      await Promise.all(
        subjects.map(async (s) => {
          out[s] = await fetchTopicsBySubject(s);
        }),
      );
      setTopicsBySubject(out);
    })();
  }, [questions]);

  const topicStats = useMemo<TopicStat[]>(() => {
    if (!attempt) return [];
    const acc = new Map<string, TopicStat>();
    for (const qid of attempt.questionOrder) {
      const q = questions[qid];
      if (!q) continue;
      const tid = q.topicId ?? "__untagged__";
      const title = q.topicTitle ?? "Untagged";
      const key = `${q.subject}::${tid}`;
      const existing = acc.get(key) ?? {
        topicId: tid,
        topicTitle: title,
        subject: q.subject,
        correct: 0,
        total: 0,
        pct: 0,
      };
      existing.total += 1;
      if (attempt.answers[qid] === q.correctIndex) existing.correct += 1;
      acc.set(key, existing);
    }
    const arr = Array.from(acc.values()).map((s) => {
      const topic = topicsBySubject[s.subject]?.find((t) => t.id === s.topicId);
      return {
        ...s,
        pct: s.total ? Math.round((s.correct / s.total) * 100) : 0,
        tip: topic?.studyTips,
        description: topic?.description,
      };
    });
    arr.sort((a, b) => b.pct - a.pct);
    return arr;
  }, [attempt, questions, topicsBySubject]);

  if (!session || !attempt) return <div className="text-muted-foreground">Loading…</div>;
  if (!attempt.submitted) return <div>You haven't submitted this exam yet.</div>;

  const pct = attempt.totalPossible ? Math.round(((attempt.score ?? 0) / attempt.totalPossible) * 100) : 0;
  const correctionsOpen = session.status === "corrections_open";

  const tagged = topicStats.filter((s) => s.topicId !== "__untagged__");
  const strengths = tagged.filter((s) => s.pct >= 70).slice(0, 4);
  const weaknesses = [...tagged].filter((s) => s.pct < 60).sort((a, b) => a.pct - b.pct).slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/student" className="text-sm text-muted-foreground hover:underline">← Back</Link>
        <h1 className="text-2xl sm:text-3xl font-bold mt-2">{session.title} — Result</h1>
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

      {tagged.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="size-4 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold">Your core strengths</h3>
            </div>
            {strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keep pushing — no topic hit 70% yet.</p>
            ) : (
              <ul className="space-y-2">
                {strengths.map((s) => (
                  <li key={`${s.subject}-${s.topicId}`} className="flex items-center justify-between text-sm">
                    <span><span className="font-medium">{s.topicTitle}</span> <span className="text-muted-foreground">· {s.subject}</span></span>
                    <span className="font-mono text-green-700 dark:text-green-400">{s.pct}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="size-4 text-amber-600 dark:text-amber-400" />
              <h3 className="font-semibold">Areas to focus on</h3>
            </div>
            {weaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Excellent — no weak topics detected.</p>
            ) : (
              <ul className="space-y-2">
                {weaknesses.map((s) => (
                  <li key={`${s.subject}-${s.topicId}`} className="flex items-center justify-between text-sm">
                    <span><span className="font-medium">{s.topicTitle}</span> <span className="text-muted-foreground">· {s.subject}</span></span>
                    <span className="font-mono text-amber-700 dark:text-amber-400">{s.pct}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {weaknesses.some((w) => w.tip || w.description) && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="size-4 text-primary" />
            <h3 className="font-semibold">Suggested study plan</h3>
          </div>
          <div className="space-y-3">
            {weaknesses.map((w) => (
              <div key={`tip-${w.subject}-${w.topicId}`} className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{w.topicTitle} <span className="text-muted-foreground font-normal">· {w.subject}</span></p>
                  <span className="text-xs font-mono text-muted-foreground">{w.correct}/{w.total}</span>
                </div>
                {w.description && <p className="text-xs text-muted-foreground mt-1.5">{w.description}</p>}
                {w.tip && <p className="text-sm mt-2 border-l-2 border-primary/40 pl-3">{w.tip}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tagged.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="size-4 text-primary" />
            <h3 className="font-semibold">Full topic performance</h3>
          </div>
          <div className="space-y-2">
            {tagged.map((s) => (
              <div key={`row-${s.subject}-${s.topicId}`} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span><span className="font-medium">{s.topicTitle}</span> <span className="text-muted-foreground">· {s.subject}</span></span>
                  <span className="font-mono text-muted-foreground">{s.correct}/{s.total} · {s.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${s.pct >= 70 ? "bg-green-500" : s.pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
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
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Question {idx + 1} {got ? "✓" : "✗"}</span>
                  {q.topicTitle && (
                    <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{q.topicTitle}</span>
                  )}
                </div>
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
