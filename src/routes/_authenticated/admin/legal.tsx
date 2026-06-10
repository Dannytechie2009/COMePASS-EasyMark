import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listenLegal, saveLegal, type LegalDoc, type LegalKind } from "@/lib/legal";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/legal")({
  component: LegalAdminPage,
});

function LegalAdminPage() {
  const { profile } = useAuth();
  if (profile && profile.role !== "super_admin") return <Navigate to="/admin" />;

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 text-primary p-2.5"><Scale className="size-5" /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Legal documents</h1>
          <p className="text-sm text-muted-foreground mt-1">Edit the Privacy Policy and Terms of Use. Saving bumps the version and prompts every student to re-read.</p>
        </div>
      </header>

      <Editor kind="privacy" title="Privacy Policy" uid={profile!.uid} />
      <Editor kind="terms" title="Terms of Use" uid={profile!.uid} />
    </div>
  );
}

function Editor({ kind, title, uid }: { kind: LegalKind; title: string; uid: string }) {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => listenLegal(kind, (d) => {
    setDoc(d);
    setBody((prev) => prev || d?.body || "");
  }), [kind]);

  async function save() {
    if (!body.trim()) return toast.error("Cannot save an empty document");
    setBusy(true);
    try {
      const v = await saveLegal(kind, body, uid);
      toast.success(`Saved — now version ${v}. Students will be prompted to re-read.`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {doc ? `Version ${doc.version}${doc.updatedAt?.toDate ? ` · updated ${doc.updatedAt.toDate().toLocaleString()}` : ""}` : "Not published yet"}
        </span>
      </div>
      <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Write the ${title.toLowerCase()} here. Plain text or Markdown.`} />
      <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save & publish new version"}</Button>
    </div>
  );
}
