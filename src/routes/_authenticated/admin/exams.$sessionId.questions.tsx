import { Spinner } from "@/components/Spinner";
import { createFileRoute, Link, Navigate, useParams } from "@tanstack/react-router";
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
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { getSessionSubjects, type ExamSession, type Question } from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { BookOpen, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/exams/$sessionId/questions")({
  component: SessionQuestions,
});

function SessionQuestions() {
  const { profile } = useAuth();
  if (profile && profile.role === "student") return <Navigate to="/student" />;

  const { sessionId } = useParams({ from: "/_authenticated/admin/exams/$sessionId/questions" });
  const [session, setSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<Record<string, Question>>({});
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string>("all");

  useEffect(() => {
    return onSnapshot(doc(getDb(), "examSessions", sessionId), (s) => {
      if (s.exists()) setSession({ id: s.id, ...(s.data() as any) });
      else setSession(null);
    });
  }, [sessionId]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      const ids = session.questionIds ?? [];
      const map: Record<string, Question> = {};
      for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30);
        if (chunk.length === 0) continue;
        const snap = await getDocs(query(collection(getDb(), "questions"), where(documentId(), "in", chunk)));
        for (const d of snap.docs) map[d.id] = { id: d.id, ...(d.data() as any) };
      }
      setQuestions(map);
      setLoading(false);
    })();
  }, [session]);

  const ordered = useMemo(() => (session?.questionIds ?? []).map((id) => questions[id]).filter(Boolean) as Question[], [session, questions]);
  const subjects = useMemo(() => Array.from(new Set(ordered.map((q) => q.subject))), [ordered]);
  const visible = filterSubject === "all" ? ordered : ordered.filter((q) => q.subject === filterSubject);

  if (!session) return <Spinner label="Loading exam…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <Link to="/admin/exams/$sessionId" params={{ sessionId }} className="text-sm text-muted-foreground hover:underline">← Back to exam</Link>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2 flex items-center gap-2">
            <BookOpen className="size-6 text-primary" /> Assigned questions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {session.title} · {getSessionSubjects(session).join(" + ")} · {session.questionIds.length} questions
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            These are the exact questions in the master pool. Every student gets the same questions{session.shuffleQuestions ? ", in a shuffled order" : ""}
            {session.shuffleOptions ? " with shuffled options" : ""}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4 mr-1" /> Print
        </Button>
      </div>

      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setFilterSubject("all")}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${filterSubject === "all" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
          >All ({ordered.length})</button>
          {subjects.map((s) => {
            const n = ordered.filter((q) => q.subject === s).length;
            const on = filterSubject === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilterSubject(s)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
              >{s} ({n})</button>
            );
          })}
        </div>
      )}

      {loading && ordered.length === 0 && <Spinner label="Loading questions…" />}

      <div className="space-y-4">
        {visible.map((q, idx) => (
          <div key={q.id} className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Q{idx + 1} · {q.subject}</span>
              {q.topicTitle && (
                <span className="uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{q.topicTitle}</span>
              )}
            </div>
            <div className="font-medium whitespace-pre-wrap">{q.text}</div>
            {q.imageUrl && <img src={q.imageUrl} alt="" className="max-h-56 rounded border" />}
            <ul className="text-sm space-y-1">
              {q.options.map((o, i) => (
                <li
                  key={i}
                  className={i === q.correctIndex ? "text-green-600 dark:text-green-400 font-medium" : ""}
                >
                  {"ABCD"[i]}. {o} {i === q.correctIndex && "✓"}
                </li>
              ))}
            </ul>
            {q.explanation && (
              <p className="text-sm text-muted-foreground border-l-2 pl-3 mt-2 whitespace-pre-wrap">{q.explanation}</p>
            )}
          </div>
        ))}
        {!loading && visible.length === 0 && (
          <p className="text-sm text-muted-foreground">No questions to show.</p>
        )}
      </div>
    </div>
  );
}
