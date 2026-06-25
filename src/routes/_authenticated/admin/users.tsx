import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth, type Role } from "@/lib/auth-context";
import type { Department, Subject } from "@/lib/subjects";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Shield, GraduationCap, UserCog } from "lucide-react";
import { toast } from "sonner";

interface UserDoc {
  uid: string;
  name: string;
  email: string;
  role: Role;
  department?: Department;
  subjects?: Subject[];
  studentId?: string;
  createdAt?: number;
}

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const { profile } = useAuth();
  if (profile && profile.role !== "super_admin") {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <Shield className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Super admin only</h2>
        <p className="text-sm text-muted-foreground">Ask a super admin for access to user management.</p>
      </div>
    );
  }

  const [users, setUsers] = useState<UserDoc[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");

  useEffect(() => {
    return onSnapshot(collection(getDb(), "users"), (s) => {
      const list = s.docs.map((d) => ({ uid: d.id, ...(d.data() as any) })) as UserDoc[];
      list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      setUsers(list);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.studentId?.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const counts = useMemo(() => ({
    students: users.filter((u) => u.role === "student").length,
    tutors: users.filter((u) => u.role === "tutor").length,
    supers: users.filter((u) => u.role === "super_admin").length,
  }), [users]);

  async function changeRole(uid: string, role: Role) {
    try {
      await updateDoc(doc(getDb(), "users", uid), { role });
      toast.success("Role updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage students, tutors and super admins.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={GraduationCap} label="Students" value={counts.students} />
            <Stat icon={UserCog} label="Tutors" value={counts.tutors} />
            <Stat icon={Shield} label="Supers" value={counts.supers} accent />
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, ID…" className="pl-9" />
        </div>
        <div className="inline-flex rounded-lg border p-1 text-sm">
          {(["all", "student", "tutor", "super_admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded-md capitalize ${roleFilter === r ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {r.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Department</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Subjects</th>
                <th className="text-left px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((u) => (
                <tr key={u.uid} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    {u.studentId && <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{u.studentId}</div>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell capitalize text-muted-foreground">{u.department ?? "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(u.subjects ?? []).map((s) => (
                        <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-muted">{s}</span>
                      ))}
                      {!u.subjects?.length && <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.uid, e.target.value as Role)}
                      className="rounded-md border bg-background px-2 py-1 text-sm"
                      disabled={u.uid === profile?.uid}
                    >
                      <option value="student">Student</option>
                      <option value="tutor">Tutor</option>
                      <option value="super_admin">Super admin</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No users match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        You can't change your own role. Ask another super admin if you need to be downgraded.
      </p>
      <div>
        <Button variant="outline" onClick={() => { setSearch(""); setRoleFilter("all"); }}>Reset filters</Button>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Shield; label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 text-center min-w-[80px] ${accent ? "border-primary/30 bg-primary/5" : "bg-muted/40"}`}>
      <Icon className={`mx-auto size-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <div className={`text-lg font-bold mt-1 ${accent ? "text-primary" : ""}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
