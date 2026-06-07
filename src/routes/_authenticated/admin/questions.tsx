import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { ALL_SUBJECTS, type Subject } from "@/lib/subjects";
import type { Question } from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/ImageUploader";
import { listenTopicsBySubject, type Topic } from "@/lib/syllabus";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/questions")({
  component: QuestionBank,
});

const EMPTY: Omit<Question, "id" | "createdBy" | "createdAt"> = {
  subject: "English",
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  explanation: "",
  imageUrl: undefined,
  topicId: null,
  topicTitle: null,
};

function QuestionBank() {
  const { profile } = useAuth();
  if (profile && profile.role === "student") return <Navigate to="/student" />;

  const [subject, setSubject] = useState<Subject>("English");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [editing, setEditing] = useState<Question | null>(null);
  const [draft, setDraft] = useState<typeof EMPTY>(EMPTY);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const q = query(
      collection(getDb(), "questions"),
      where("subject", "==", subject),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    }, (e) => toast.error(e.message));
  }, [subject]);

  useEffect(() => listenTopicsBySubject(subject, setTopics), [subject]);

  function openCreate() {
    setEditing(null);
    setDraft({ ...EMPTY, subject });
    setShowForm(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setDraft({
      subject: q.subject,
      text: q.text,
      options: [...q.options] as [string, string, string, string],
      correctIndex: q.correctIndex,
      explanation: q.explanation ?? "",
      imageUrl: q.imageUrl,
      topicId: q.topicId ?? null,
      topicTitle: q.topicTitle ?? null,
    });
    setShowForm(true);
  }

  async function save() {
    if (!draft.text.trim()) return toast.error("Question text required");
    if (draft.options.some((o) => !o.trim())) return toast.error("All 4 options required");
    try {
      const db = getDb();
      const payload: any = {
        subject: draft.subject,
        text: draft.text.trim(),
        options: draft.options,
        correctIndex: draft.correctIndex,
        explanation: draft.explanation?.trim() || null,
        imageUrl: draft.imageUrl ?? null,
        topicId: draft.topicId ?? null,
        topicTitle: draft.topicTitle ?? null,
        createdBy: profile!.uid,
      };
      if (editing) {
        await updateDoc(doc(db, "questions", editing.id), payload);
        toast.success("Question updated");
      } else {
        await addDoc(collection(db, "questions"), { ...payload, createdAt: serverTimestamp() });
        toast.success("Question added");
      }
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remove(q: Question) {
    if (!confirm("Delete this question?")) return;
    try {
      await deleteDoc(doc(getDb(), "questions", q.id));
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Question bank</h1>
          <p className="text-muted-foreground text-sm">{questions.length} questions in {subject}</p>
        </div>
        <Button onClick={openCreate}>+ Add question</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={`rounded-full px-3 py-1 text-sm border ${
              subject === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-lg border p-5 space-y-4 bg-card">
          <h2 className="font-semibold">{editing ? "Edit question" : "New question"}</h2>
          <div className="space-y-2">
            <Label>Subject</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value as Subject })}
            >
              {ALL_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Topic {topics.length === 0 && <span className="text-xs text-muted-foreground">(none defined yet — add in Syllabus)</span>}</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={draft.topicId ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                const t = topics.find((x) => x.id === id);
                setDraft({ ...draft, topicId: id, topicTitle: t?.title ?? null });
              }}
            >
              <option value="">— Untagged —</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Question text</Label>
            <Textarea rows={3} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Image (optional)</Label>
            <ImageUploader value={draft.imageUrl} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />
          </div>
          <div className="space-y-2">
            <Label>Options (select the correct one)</Label>
            {draft.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={draft.correctIndex === i}
                  onChange={() => setDraft({ ...draft, correctIndex: i as 0 | 1 | 2 | 3 })}
                />
                <span className="w-6 text-sm text-muted-foreground">{"ABCD"[i]}</span>
                <Input
                  value={opt}
                  onChange={(e) => {
                    const next = [...draft.options] as [string, string, string, string];
                    next[i] = e.target.value;
                    setDraft({ ...draft, options: next });
                  }}
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Explanation (optional)</Label>
            <Textarea rows={2} value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>{editing ? "Save changes" : "Add question"}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {questions.length === 0 && (
          <p className="text-sm text-muted-foreground">No questions yet. Add the first one.</p>
        )}
        {questions.map((q, idx) => (
          <div key={q.id} className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between gap-3">
              <div className="text-sm font-medium">{idx + 1}. {q.text}</div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => openEdit(q)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(q)}>Delete</Button>
              </div>
            </div>
            {q.imageUrl && <img src={q.imageUrl} alt="" className="max-h-40 rounded border" />}
            <ol className="text-sm space-y-1">
              {q.options.map((o, i) => (
                <li key={i} className={i === q.correctIndex ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                  {"ABCD"[i]}. {o} {i === q.correctIndex && "✓"}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
