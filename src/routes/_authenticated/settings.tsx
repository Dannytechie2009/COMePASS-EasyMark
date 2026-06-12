import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile as updateAuthProfile,
} from "firebase/auth";
import { useAuth } from "@/lib/auth-context";
import { getDb, getFirebaseAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Gender } from "@/lib/subjects";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(profile?.name ?? "");
  const [gender, setGender] = useState<Gender | "">(profile?.gender ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmPwd, setConfirmPwd] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!profile) return null;

  async function deleteMyAccount() {
    if (!user) return;
    if (!confirm("This permanently deletes your account, profile, and all exam history. Continue?")) return;
    setDeleting(true);
    try {
      // Re-authenticate (required by Firebase for sensitive ops on older sessions)
      if (confirmPwd && user.email) {
        const cred = EmailAuthProvider.credential(user.email, confirmPwd);
        try { await reauthenticateWithCredential(user, cred); } catch (e: any) {
          throw new Error(e?.message ?? "Wrong password");
        }
      }
      // Wipe exam attempts
      const snap = await getDocs(query(collection(getDb(), "attempts"), where("uid", "==", user.uid)));
      const batch = writeBatch(getDb());
      snap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(getDb(), "users", user.uid));
      await batch.commit();
      // Delete auth user
      await deleteUser(user);
      toast.success("Account deleted");
      nav({ to: "/" });
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes("requires-recent-login")) {
        toast.error("Please enter your password above and try again.");
      } else {
        toast.error(msg);
      }
    } finally {
      setDeleting(false);
    }
  }


  async function save() {
    if (!name.trim()) return toast.error("Name is required");
    if (profile?.role === "student" && !gender) return toast.error("Gender is required");
    setBusy(true);
    try {
      await updateDoc(doc(getDb(), "users", profile!.uid), {
        name: name.trim(),
        ...(gender ? { gender } : {}),
      });
      if (user) {
        try {
          await updateAuthProfile(user, { displayName: name.trim() });
        } catch {/* ignore */}
      }
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 text-primary p-2.5"><SettingsIcon className="size-5" /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Update your personal information.</p>
        </div>
      </header>

      <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <div className="space-y-2">
          <Label>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={profile.email} disabled />
          <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
        </div>

        {profile.role === "student" && (
          <>
            <div className="space-y-2">
              <Label>Gender</Label>
              <div className="grid grid-cols-3 gap-2 max-w-sm">
                {(["male", "female", "other"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`rounded-md border px-2 py-2 text-sm capitalize transition-colors ${
                      gender === g ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-muted-foreground text-xs">Student ID</div>
                <div className="font-mono">{profile.studentId}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-muted-foreground text-xs">Department</div>
                <div className="capitalize">{profile.department}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                <div className="text-muted-foreground text-xs">Subjects</div>
                <div>{profile.subjects?.join(", ") || "—"}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Subject combinations are tied to your department — contact your tutor to change them.</p>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </div>
      </div>
    </div>
  );
}
