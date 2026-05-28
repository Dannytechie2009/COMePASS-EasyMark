import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { ALL_SUBJECTS, type Subject } from "@/lib/subjects";
import type { ExamSession, Question } from "@/lib/exams";
import { computeStatus } from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/exams")({
  component: ExamsPage,
});

function ExamsPage() {
  const { profile } = useAuth();
  if (profile && profile.role === "student") return <Navigate to="/student" />;

  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(getDb(), "examSessions"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (s) => setSessions(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exam sessions</h1>
        <Button onClick={() => setCreating(true)}>+ New exam</Button>
      </div>

      {creating && <CreateExam onClose={() => setCreating(false)} createdBy={profile!.uid} />}

      <div className="space-y-3">
        {sessions.length === 0 && <p className="text-sm text-muted-foreground">No exams yet.</p>}
        {sessions.map((s) => {
          const status = computeStatus(s);
          return (
            <Link
              key={s.id}
              to="/admin/exams/$sessionId"
              params={{ sessionId: s.id }}
              className="block rounded-lg border p-4 hover:bg-accent transition-colors"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {s.subject} · {s.questionIds.length} questions · {s.durationMinutes} min
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Starts {s.startAt.toDate().toLocaleString()}
                  </div>
                </div>
                <StatusPill status={status} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    live: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    ended: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    corrections_open: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  };
  return <span className={`text-xs px-2 py-1 rounded-full h-fit ${colors[status]}`}>{status.replace("_", " ")}</span>;
}

function CreateExam({ onClose, createdBy }: { onClose: () => void; createdBy: string }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<Subject>("English");
  const [pool, setPool] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(30);
  const [startAt, setStartAt] = useState(() => {
    const d = new Date(Date.now() + 5 * 60_000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(query(collection(getDb(), "questions"), where("subject", "==", subject)));
      setPool(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      setSelected(new Set());
    })();
  }, [subject]);

  async function save() {
    if (!title.trim()) return toast.error("Title required");
    if (selected.size === 0) return toast.error("Pick at least one question");
    setBusy(true);
    try {
      await addDoc(collection(getDb(), "examSessions"), {
        title: title.trim(),
        mode: "single",
        subject,
        questionIds: Array.from(selected),
        durationMinutes: duration,
        startAt: Timestamp.fromDate(new Date(startAt)),
        shuffleQuestions,
        shuffleOptions,
        status: "scheduled",
        createdBy,
        createdAt: serverTimestamp(),
      });
      toast.success("Exam scheduled");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleAll() {
    if (selected.size === pool.length) setSelected(new Set());
    else setSelected(new Set(pool.map((q) => q.id)));
  }

  return (
    <div className="rounded-lg border p-5 space-y-4 bg-card">
      <h2 className="font-semibold">New single-subject exam</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-2 sm:col-span-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. English Mock 1" />
        </div>
        <div className="space-y-2">
          <Label>Subject</Label>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={subject}
            onChange={(e) => setSubject(e.target.value as Subject)}
          >
            {ALL_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Duration (min)</Label>
          <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Start at</Label>
          <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <Checkbox checked={shuffleQuestions} onCheckedChange={(v) => setShuffleQuestions(!!v)} /> Shuffle questions
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={shuffleOptions} onCheckedChange={(v) => setShuffleOptions(!!v)} /> Shuffle options
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Pick questions ({selected.size}/{pool.length})</Label>
          {pool.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
              {selected.size === pool.length ? "Clear" : "Select all"}
            </Button>
          )}
        </div>
        <div className="max-h-72 overflow-auto rounded-md border divide-y">
          {pool.length === 0 && <p className="p-3 text-sm text-muted-foreground">No questions in {subject}. Add some first.</p>}
          {pool.map((q, i) => (
            <label key={q.id} className="flex items-start gap-2 p-3 text-sm cursor-pointer hover:bg-accent">
              <Checkbox
                checked={selected.has(q.id)}
                onCheckedChange={(v) => {
                  const next = new Set(selected);
                  if (v) next.add(q.id); else next.delete(q.id);
                  setSelected(next);
                }}
              />
              <span><span className="text-muted-foreground">{i + 1}.</span> {q.text}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Schedule exam"}</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
