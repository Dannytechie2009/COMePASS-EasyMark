import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { CheckCircle2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { attemptId, type Attempt, type ExamSession } from "@/lib/exams";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/student/exam/$sessionId/submitted")({
  component: SubmittedPage,
});

function SubmittedPage() {
  const { profile } = useAuth();
  const { sessionId } = useParams({ from: "/_authenticated/student/exam/$sessionId/submitted" });
  const nav = useNavigate();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [countdown, setCountdown] = useState(5);

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
    if (countdown <= 0) {
      nav({ to: "/student/exam/$sessionId/result", params: { sessionId } });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, nav, sessionId]);

  const pct = attempt?.totalPossible ? Math.round(((attempt.score ?? 0) / attempt.totalPossible) * 100) : null;

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
        <CheckCircle2 className="size-9" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Thank you for taking the exam!</h1>
        <p className="text-sm text-muted-foreground">
          Your answers for <span className="font-medium text-foreground">{session?.title ?? "this exam"}</span> have been submitted successfully.
        </p>
      </div>

      {attempt?.submitted && pct !== null && (
        <div className="rounded-xl bg-muted/60 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Your score</p>
          <p className="mt-1 text-3xl font-bold">
            {attempt.score}<span className="text-lg text-muted-foreground">/{attempt.totalPossible}</span>
          </p>
          <p className="text-sm text-muted-foreground">{pct}%</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Redirecting to your full result and corrections in {countdown}s…
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link to="/student/exam/$sessionId/result" params={{ sessionId }}>View result & corrections</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/student">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
