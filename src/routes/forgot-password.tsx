import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPage,
});

function ForgotPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Do NOT pass actionCodeSettings here — the continue URL must be whitelisted
      // in Firebase Console → Authentication → Settings → Authorized domains,
      // and any mismatch causes the send to fail silently. Firebase's default
      // reset flow already returns users to your app after they set a new password.
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      toast.success("If that email is registered, a reset link is on its way. Check your inbox and spam folder.");
      nav({ to: "/login" });
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/user-not-found") {
        // Do not disclose account existence — show the same success message.
        toast.success("If that email is registered, a reset link is on its way.");
        nav({ to: "/login" });
      } else if (code === "auth/invalid-email") {
        toast.error("That email address looks invalid.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many attempts. Please wait a few minutes and try again.");
      } else {
        toast.error(err?.message ?? "Failed to send reset email");
      }
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <form onSubmit={handle} className="w-full max-w-sm space-y-4 rounded-lg border p-6">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="text-sm text-muted-foreground">We'll email you a reset link.</p>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Send reset link"}</Button>
        <Link to="/login" className="block text-center text-sm text-muted-foreground hover:underline">Back to login</Link>
      </form>
    </div>
  );
}
