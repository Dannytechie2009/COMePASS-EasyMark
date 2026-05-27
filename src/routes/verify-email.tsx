import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { sendEmailVerification, signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-email")({
  component: VerifyPage,
});

function VerifyPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="min-h-screen grid place-items-center">Loading…</div>;
  if (!user) return <div className="min-h-screen grid place-items-center"><Link to="/login" className="underline">Log in</Link></div>;

  async function resend() {
    setBusy(true);
    try {
      await sendEmailVerification(user!);
      toast.success("Verification email re-sent");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    setBusy(true);
    try {
      await user!.reload();
      if (user!.emailVerified) {
        toast.success("Email verified!");
        nav({ to: "/" });
      } else {
        toast.message("Still not verified — check your inbox.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <div className="w-full max-w-md space-y-4 rounded-lg border p-6 text-center">
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to <strong>{user.email}</strong>. Click it, then come back and press
          "I verified" below.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={check} disabled={busy}>I verified my email</Button>
          <Button onClick={resend} disabled={busy} variant="outline">Resend email</Button>
          <Button variant="ghost" onClick={() => signOut(getFirebaseAuth()).then(() => nav({ to: "/login" }))}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
