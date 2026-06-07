import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Plus, Pencil, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ALL_SUBJECTS, type Subject } from "@/lib/subjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTopic, deleteTopic, listenTopicsBySubject, updateTopic, type Topic } from "@/lib/syllabus";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/syllabus")({
  component: SyllabusPage,
});

const EMPTY = { title: "", description: "", studyTips: "" };

function SyllabusPage() {
  const { profile } = useAuth();
  if (profile && profile.role === "student") return <Navigate to="/student" />;

  const [subject, setSubject] = useState<Subject>("English");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [open, setOpen] = useState(false);

  useEffect(() => listenTopicsBySubject(subject, setTopics), [subject]);

  function openNew() {
    setEditing(null);
    setDraft(EMPTY);
    setOpen(true);
  }
  function openEdit(t: Topic) {
    setEditing(t);
    setDraft({ title: t.title, description: t.description ?? "", studyTips: t.studyTips ?? "" });
    setOpen(true);
  }

  async function save() {
    if (!draft.title.trim()) return toast.error("Topic title required");
    try {
      const payload = {
        subject,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        studyTips: draft.studyTips.trim() || undefined,
        createdBy: profile!.uid,
      };
      if (editing) {
        await updateTopic(editing.id, payload);
        toast.success("Topic updated");
      } else {
        await createTopic(payload as any);
        toast.success("Topic added");
      }
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function remove(t: Topic) {
    if (!confirm(`Delete topic "${t.title}"? Existing questions tagged with it will keep their old tag label.`)) return;
    try {
      await deleteTopic(t.id);
      toast.success("Deleted");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 text-primary p-2.5"><BookOpen className="size-5" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Syllabus & topics</h1>
              <p className="text-sm text-muted-foreground mt-1">Define topics per subject. Tag each question with a topic so students get strengths, weaknesses, and personalised study tips.</p>
            </div>
          </div>
          <Button onClick={openNew}><Plus className="size-4 mr-1" />Add topic</Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {ALL_SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
              subject === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {open && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editing ? "Edit topic" : "New topic"} · {subject}</h2>
            <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Quadratic equations" />
          </div>
          <div className="space-y-2">
            <Label>Description / syllabus outline</Label>
            <Textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this topic covers, learning objectives, scope…" />
          </div>
          <div className="space-y-2">
            <Label>Study tips (shown to weak students)</Label>
            <Textarea rows={3} value={draft.studyTips} onChange={(e) => setDraft({ ...draft, studyTips: e.target.value })} placeholder="Recommended resources, practice strategy, common pitfalls…" />
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>{editing ? "Save changes" : "Add topic"}</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {topics.length === 0 && (
          <p className="text-sm text-muted-foreground sm:col-span-2">No topics yet for {subject}. Add the first one.</p>
        )}
        {topics.map((t) => (
          <div key={t.id} className="rounded-2xl border bg-card p-4 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{t.title}</h3>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(t)} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground"><Pencil className="size-4" /></button>
                <button onClick={() => remove(t)} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground"><Trash2 className="size-4" /></button>
              </div>
            </div>
            {t.description && <p className="text-sm text-muted-foreground line-clamp-3">{t.description}</p>}
            {t.studyTips && (
              <p className="text-xs border-l-2 border-primary/40 pl-2 text-muted-foreground line-clamp-2">
                <span className="font-medium text-foreground">Tip:</span> {t.studyTips}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
