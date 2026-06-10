import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp, runTransaction } from "firebase/firestore";
import { getFirebaseAuth, getDb } from "@/lib/firebase";
import {
  DEPARTMENTS,
  DEPARTMENT_RULES,
  generateStudentId,
  validateCombination,
  type Department,
  type Gender,
  type Subject,
} from "@/lib/subjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [department, setDepartment] = useState<Department>("science");
  const [selected, setSelected] = useState<Subject[]>([]);
  const [busy, setBusy] = useState(false);

  const rule = DEPARTMENT_RULES[department];
  const subjects = useMemo<Subject[]>(() => {
    return Array.from(new Set([...rule.required, ...selected.filter((s) => rule.pickFrom.includes(s))]));
  }, [department, selected, rule]);

  function toggle(s: Subject) {
    setSelected((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s].slice(-rule.pickCount)));
  }

  function changeDept(d: Department) {
    setDepartment(d);
    setSelected([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gender) return toast.error("Please select your gender");
    const check = validateCombination(department, subjects);
    if (!check.ok) {
      toast.error(check.reason);
      return;
    }
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name });

      const db = getDb();
      let studentId = "";
      for (let i = 0; i < 5; i++) {
        const candidate = generateStudentId();
        try {
          await runTransaction(db, async (tx) => {
            const ref = doc(db, "studentIds", candidate);
            const snap = await tx.get(ref);
            if (snap.exists()) throw new Error("collision");
            tx.set(ref, { uid: cred.user.uid, createdAt: serverTimestamp() });
          });
          studentId = candidate;
          break;
        } catch {
          /* retry */
        }
      }
      if (!studentId) throw new Error("Could not allocate student ID, try again");

      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        email: email.trim(),
        role: "student",
        department,
        subjects,
        studentId,
        gender,
        emailVerified: false,
        createdAt: serverTimestamp(),
      });

      try {
        await sendEmailVerification(cred.user);
      } catch (e) {
        console.warn("Failed to send verification email", e);
      }

      toast.success(`Account created! Your student ID is ${studentId}`);
      nav({ to: "/verify-email" });
    } catch (err: any) {
      toast.error(err?.message ?? "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 sm:p-6 bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-5 rounded-lg border p-5 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold">Create student account</h1>
          <p className="text-sm text-muted-foreground">You'll get a student ID after registering.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2 col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2 col-span-2 sm:col-span-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Gender</Label>
          <div className="grid grid-cols-3 gap-2">
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

        <div className="space-y-2">
          <Label>Department</Label>
          <div className="grid grid-cols-3 gap-2">
            {DEPARTMENTS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => changeDept(d.id)}
                className={`min-w-0 truncate rounded-md border px-2 py-2 text-xs sm:text-sm transition-colors ${
                  department === d.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                }`}
                title={d.label}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Subjects</Label>
          <p className="text-xs text-muted-foreground">{rule.note}</p>
          <div className="space-y-2 rounded-md border p-3">
            {rule.required.map((s) => (
              <div key={s} className="flex items-center gap-2 text-sm">
                <Checkbox checked disabled />
                <span>{s} <span className="text-muted-foreground">(required)</span></span>
              </div>
            ))}
            {rule.pickFrom.map((s) => {
              const checked = selected.includes(s);
              const disabled = !checked && selected.length >= rule.pickCount;
              return (
                <label key={s} className={`flex items-center gap-2 text-sm ${disabled ? "opacity-50" : "cursor-pointer"}`}>
                  <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggle(s)} />
                  <span>{s}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Selected: {subjects.join(", ") || "—"}</p>
        </div>

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link to="/terms" className="underline">Terms</Link> and{" "}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Have an account? <Link to="/login" className="underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
