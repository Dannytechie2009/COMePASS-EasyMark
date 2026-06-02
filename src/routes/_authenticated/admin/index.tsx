import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { BadgeCheck, BookOpen, ChartColumnBig, KeyRound, LayoutDashboard, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const { profile } = useAuth();
  if (profile && profile.role === "student") return <Navigate to="/student" />;

  const isSuper = profile?.role === "super_admin";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-8 lg:py-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <BadgeCheck className="size-3.5" />
              Admin control center
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Manage COMePASS with clarity</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Organize questions, schedule exam sessions, review results, and oversee access from one consistent workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1.5">Signed in as {profile?.name}</span>
              <span className="rounded-full bg-muted px-3 py-1.5 capitalize">{profile?.role?.replace("_", " ")}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniStat icon={BookOpen} label="Question tools" value="Live" />
            <MiniStat icon={LayoutDashboard} label="Session control" value="Ready" accent />
            <MiniStat icon={ChartColumnBig} label="Analytics" value={isSuper ? "Enabled" : "Tutor view"} />
            <MiniStat icon={KeyRound} label="Access keys" value={isSuper ? "Manage" : "View"} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card icon={BookOpen} title="Question bank" desc="Create, edit and organise questions by subject." to="/admin/questions" />
        <Card icon={LayoutDashboard} title="Exam sessions" desc="Schedule single-subject and combo exams, then monitor attempts." to="/admin/exams" />
        {isSuper ? (
          <Card icon={Users2} title="Users" desc="Review student profiles, change roles and oversee accounts." to="/admin/users" />
        ) : (
          <MutedCard icon={Users2} title="Users" desc="User management is reserved for super admins." />
        )}
        <Card icon={ChartColumnBig} title="Departments" desc="Participation and subject performance by department." to="/admin/departments" />
        <MutedCard icon={KeyRound} title="Product keys" desc="Each exam can require its own product key — set it on the exam creation form." />
        <MutedCard icon={BadgeCheck} title="Corrections & results" desc="Release corrections and review live scoreboards from each session detail page." />

      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Quick start</h2>
            <p className="text-sm text-muted-foreground">Set up your next mock in a few steps.</p>
          </div>
          <Button asChild>
            <Link to="/admin/exams">Create an exam</Link>
          </Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StepCard step="01" title="Prepare questions" desc="Keep each subject bank current with explanations and diagrams." />
          <StepCard step="02" title="Schedule sessions" desc="Set start time, duration, shuffle rules, and product-key requirements." />
          <StepCard step="03" title="Monitor results" desc="Watch submissions in real time, then release corrections when ready." />
        </div>
      </section>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, accent }: { icon: typeof BookOpen; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-primary/30 bg-primary/10" : "border-border/70 bg-muted/40"}`}>
      <Icon className={`mb-3 size-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-primary">{step}</div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function MutedCard({ icon: Icon, title, desc }: { icon: typeof BookOpen; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 opacity-80 shadow-sm">
      <Icon className="size-5 text-muted-foreground" />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Card({ icon: Icon, title, desc, to }: { icon: typeof BookOpen; title: string; desc: string; to: string }) {
  return (
    <Link to={to} className="group rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <Icon className="size-5 text-primary" />
      <h3 className="mt-4 font-semibold transition-colors group-hover:text-primary">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <span className="mt-4 inline-flex text-sm font-medium text-primary">Open →</span>
    </Link>
  );
}
