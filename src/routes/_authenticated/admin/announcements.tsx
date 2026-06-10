import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Megaphone, Plus, Trash2, X, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUploader } from "@/components/ImageUploader";
import {
  createAnnouncement,
  deleteAnnouncement,
  listenAnnouncements,
  type Announcement,
  type AnnouncementAudience,
} from "@/lib/announcements";
import { ALL_SUBJECTS, DEPARTMENTS, type Department, type Subject } from "@/lib/subjects";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  component: AdminAnnouncementsPage,
});

function AdminAnnouncementsPage() {
  const { profile } = useAuth();
  if (profile && profile.role === "student") return <Navigate to="/student" />;

  const [list, setList] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => listenAnnouncements(setList), []);

  async function remove(a: Announcement) {
    if (!confirm(`Delete announcement "${a.title}"?`)) return;
    try { await deleteAnnouncement(a.id); toast.success("Deleted"); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border bg-card p-6 shadow-sm flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-xl bg-primary/10 text-primary p-2.5 shrink-0"><Megaphone className="size-5" /></div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Announcements</h1>
            <p className="text-sm text-muted-foreground mt-1">Send notifications to all students or target by department / subject. Add an image if helpful.</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="size-4 mr-1" />New announcement</Button>
      </header>

      {open && <Composer onClose={() => setOpen(false)} createdBy={profile!.uid} createdByName={profile!.name} />}

      <div className="grid gap-3">
        {list.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
        {list.map((a) => (
          <article key={a.id} className="rounded-2xl border bg-card p-4 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {a.audience.kind === "all" ? "All students" : `Targeted: ${[
                    a.audience.departments?.join(", "),
                    a.audience.subjects?.join(", "),
                  ].filter(Boolean).join(" · ") || "—"}`} · by {a.createdByName ?? "Admin"}
                </p>
              </div>
              <button onClick={() => remove(a)} className="rounded-md p-1.5 hover:bg-muted text-muted-foreground"><Trash2 className="size-4" /></button>
            </div>
            {a.imageUrl && <img src={a.imageUrl} alt="" className="rounded-lg max-h-56 object-cover w-full" />}
            <p className="text-sm whitespace-pre-wrap">{a.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function Composer({ onClose, createdBy, createdByName }: { onClose: () => void; createdBy: string; createdByName: string }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [targeted, setTargeted] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [busy, setBusy] = useState(false);

  function toggleDept(d: Department) {
    setDepartments((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]);
  }
  function toggleSubj(s: Subject) {
    setSubjects((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);
  }

  async function save() {
    if (!title.trim() || !body.trim()) return toast.error("Title and message required");
    const audience: AnnouncementAudience = targeted
      ? { kind: "targeted", departments: departments.length ? departments : undefined, subjects: subjects.length ? subjects : undefined }
      : { kind: "all" };
    if (targeted && !departments.length && !subjects.length) return toast.error("Pick at least one department or subject");
    setBusy(true);
    try {
      await createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl ?? null,
        audience,
        createdBy,
        createdByName,
      });
      toast.success("Announcement sent");
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">New announcement</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
      </div>

      <div className="space-y-2">
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mock exam this Saturday" />
      </div>

      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the message students should see…" />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2"><ImageIcon className="size-4" /> Optional image</Label>
        <ImageUploader value={imageUrl} onChange={setImageUrl} />
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox checked={targeted} onCheckedChange={(v) => setTargeted(!!v)} />
          Send to a specific audience (instead of all students)
        </label>
        {targeted && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Departments</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DEPARTMENTS.map((d) => {
                  const on = departments.includes(d.id);
                  return (
                    <button key={d.id} type="button" onClick={() => toggleDept(d.id)}
                      className={`rounded-full border px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs">Subjects</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ALL_SUBJECTS.map((s) => {
                  const on = subjects.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleSubj(s)}
                      className={`rounded-full border px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={busy}>{busy ? "Sending…" : "Send announcement"}</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
