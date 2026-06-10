import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { listenLegal, type LegalDoc } from "@/lib/legal";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — COMePASS Prevarsity" },
      { name: "description", content: "How COMePASS Prevarsity collects, uses and protects your information." },
    ],
  }),
});

function PrivacyPage() {
  return <LegalView kind="privacy" title="Privacy Policy" />;
}

export function LegalView({ kind, title }: { kind: "privacy" | "terms"; title: string }) {
  const { profile, user } = useAuth();
  const [d, setD] = useState<LegalDoc | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => listenLegal(kind, setD), [kind]);

  const acknowledged = (profile?.acknowledgedLegal?.[kind] ?? 0) >= (d?.version ?? 0);

  async function acknowledge() {
    if (!profile) return;
    setBusy(true);
    try {
      await updateDoc(doc(getDb(), "users", profile.uid), {
        [`acknowledgedLegal.${kind}`]: d?.version ?? 1,
      });
      toast.success("Thanks for confirming");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold">COMePASS Prevarsity</Link>
          {user ? (
            <Link to={profile?.role === "student" ? "/student" : "/admin"} className="text-sm underline">Back to app</Link>
          ) : (
            <Link to="/login" className="text-sm underline">Log in</Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {d && (
            <p className="text-xs text-muted-foreground mt-2">
              Version {d.version}
              {d.updatedAt?.toDate && ` · last updated ${d.updatedAt.toDate().toLocaleDateString()}`}
            </p>
          )}
        </div>

        <article className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-7">
          {d?.body || (
            <p className="text-muted-foreground">
              This document hasn't been published yet. Please check back soon.
            </p>
          )}
        </article>

        {profile?.role === "student" && d && !acknowledged && (
          <div className="rounded-2xl border bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">Please confirm you've read this updated document.</p>
            <Button onClick={acknowledge} disabled={busy}>{busy ? "Saving…" : "I've read this"}</Button>
          </div>
        )}
      </main>
    </div>
  );
}
