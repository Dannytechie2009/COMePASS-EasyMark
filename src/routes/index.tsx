import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  GraduationCap,
  Timer,
  ShieldCheck,
  Trophy,
  BookOpen,
  BarChart3,
  Sparkles,
  Users,
  Check,
  ChevronDown,
  Twitter,
  Facebook,
  Instagram,
  Mail,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import logoAsset from "@/assets/comepass-logo.png.asset.json";


export const Route = createFileRoute("/")({
  component: Landing,
});

const nav = [
  { href: "#features", label: "Features" },
  { href: "#services", label: "Services" },
  { href: "#stats", label: "Results" },
  { href: "#testimonials", label: "Reviews" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

function Landing() {
  const { user, profile, loading, configured } = useAuth();

  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-xl space-y-4 rounded-2xl border p-8">
          <h1 className="text-2xl font-bold">Firebase not configured</h1>
          <p className="text-muted-foreground">
            Open <code className="px-1 py-0.5 rounded bg-muted">src/lib/firebase.ts</code> and paste your Firebase config.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading…</div>;
  if (user && profile) return <Navigate to={profile.role === "student" ? "/student" : "/admin"} />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Stats />
        <Services />
        <Testimonials />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- Navbar ---------- */
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all ${
        scrolled ? "bg-background/85 backdrop-blur-md border-b shadow-sm" : "bg-background/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-lg">
          <img src={logoAsset.url} alt="COMePASS Prevarsity" width={40} height={40} className="rounded-full ring-1 ring-border" />
          <span className="leading-tight">
            <span className="block">COM<span className="text-[var(--brand-red)]">e</span>PASS</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground -mt-0.5">Prevarsity</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/login">Log in</Link></Button>
          <Button asChild className="shadow-sm"><Link to="/register">Get started</Link></Button>
        </div>
        <button
          aria-label="Open menu"
          className="lg:hidden grid place-items-center w-10 h-10 rounded-lg hover:bg-muted"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t bg-background animate-fade-in">
          <div className="mx-auto max-w-[1280px] px-5 py-4 flex flex-col gap-1">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="px-3 py-3 rounded-lg text-sm font-medium hover:bg-muted"
              >
                {n.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline" className="flex-1"><Link to="/login">Log in</Link></Button>
              <Button asChild className="flex-1"><Link to="/register">Get started</Link></Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.6]"
        style={{
          background:
            "radial-gradient(60% 50% at 80% 0%, color-mix(in oklab, var(--brand-orange) 18%, transparent), transparent 60%), radial-gradient(50% 50% at 10% 20%, color-mix(in oklab, var(--brand-green) 14%, transparent), transparent 60%)",
        }}
      />
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-7">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[var(--brand-orange)]" /> Built for the 2026 UTME season
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
            Practice JAMB UTME the way you'll <span className="text-[var(--brand-orange)]">actually take it.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
            Real CBT timing, shuffled questions, instant scoring, and a live scoreboard your tutor controls. Built for serious tutorial centers and ambitious students.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-7 text-base shadow-md hover:shadow-lg transition-shadow">
              <Link to="/register">Start practicing <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="h-12 px-7 text-base bg-[var(--brand-green)] text-white hover:bg-[var(--brand-green)]/90 shadow-md"
            >
              <Link to="/login">I have an account</Link>
            </Button>
          </div>
          <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[var(--brand-green)]" /> Free trial</div>
            <div className="flex items-center gap-2"><Check className="w-4 h-4 text-[var(--brand-green)]" /> No card needed</div>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-[var(--brand-orange)]/20 via-transparent to-[var(--brand-green)]/15 blur-2xl" />
      <div className="rounded-3xl border bg-card shadow-xl p-5 lg:p-6">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-brick)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-orange)]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-green)]" />
            <span className="ml-2 text-muted-foreground">Mathematics • Q 14 / 40</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-brick)]">
            <Timer className="w-4 h-4" /> 38:24
          </div>
        </div>
        <div className="pt-5 space-y-4">
          <p className="font-semibold text-base sm:text-lg leading-snug">
            If 2x + 5 = 17, what is the value of x?
          </p>
          <div className="grid gap-2">
            {[
              { l: "A", t: "4", ok: false },
              { l: "B", t: "6", ok: true },
              { l: "C", t: "8", ok: false },
              { l: "D", t: "11", ok: false },
            ].map((o) => (
              <div
                key={o.l}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                  o.ok ? "border-[var(--brand-green)]/60 bg-[var(--brand-green)]/10" : "hover:bg-muted/60"
                }`}
              >
                <span className={`grid place-items-center w-7 h-7 rounded-lg text-xs font-bold ${
                  o.ok ? "bg-[var(--brand-green)] text-white" : "bg-muted text-foreground"
                }`}>{o.l}</span>
                <span>{o.t}</span>
                {o.ok && <Check className="ml-auto w-4 h-4 text-[var(--brand-green)]" />}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-xs text-muted-foreground">Auto-saved · 12s ago</span>
            <Button size="sm">Next question</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Features ---------- */
const features = [
  { icon: Timer, color: "orange", title: "Real CBT timing", desc: "Server-synced timers with auto-submit so practice mirrors exam day." },
  { icon: ShieldCheck, color: "green", title: "Anti-cheat shuffling", desc: "Question and option orders shuffled per student, persisted on refresh." },
  { icon: BarChart3, color: "brick", title: "Live scoreboard", desc: "Tutors watch progress and scores update in real time as students submit." },
  { icon: BookOpen, color: "orange", title: "Full JAMB combos", desc: "Every 4-subject UTME combination across Science, Arts and Commercial." },
  { icon: Trophy, color: "green", title: "Instant corrections", desc: "Release answers and explanations the moment the exam is done." },
  { icon: Users, color: "brick", title: "Tutor controls", desc: "Schedule exams, manage students, reset passwords, issue trial keys." },
];

function Features() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
        <SectionHeader
          eyebrow="Features"
          title="Everything a tutorial center needs"
          subtitle="A focused toolkit, no clutter — designed with tutors and JAMB students in the room."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border bg-card p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div
                className={`w-12 h-12 rounded-xl grid place-items-center mb-5 transition-transform group-hover:scale-105`}
                style={{
                  backgroundColor:
                    f.color === "orange"
                      ? "color-mix(in oklab, var(--brand-orange) 14%, transparent)"
                      : f.color === "green"
                      ? "color-mix(in oklab, var(--brand-green) 14%, transparent)"
                      : "color-mix(in oklab, var(--brand-brick) 14%, transparent)",
                  color:
                    f.color === "orange"
                      ? "var(--brand-orange)"
                      : f.color === "green"
                      ? "var(--brand-green)"
                      : "var(--brand-brick)",
                }}
              >
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Stats ---------- */
function Stats() {
  const stats = [
    { value: 12000, suffix: "+", label: "Students prepared" },
    { value: 320, suffix: "+", label: "Tutorial partners" },
    { value: 98, suffix: "%", label: "Would recommend" },
    { value: 4, suffix: "×", label: "Faster grading" },
  ];
  return (
    <section id="stats" className="py-16 lg:py-20 bg-[var(--muted)]">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, i) => (
          <div key={i} className="rounded-2xl bg-card border p-6 text-center shadow-sm">
            <div className="text-3xl sm:text-4xl font-bold text-[var(--brand-green)]">
              <Counter to={s.value} />{s.suffix}
            </div>
            <div className="mt-2 text-xs sm:text-sm text-muted-foreground font-medium">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Counter({ to }: { to: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const start = performance.now();
          const dur = 1200;
          const step = (t: number) => {
            const p = Math.min(1, (t - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setN(Math.round(to * eased));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          obs.disconnect();
        }
      });
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{n.toLocaleString()}</span>;
}

/* ---------- Services ---------- */
function Services() {
  const services = [
    {
      title: "Single-subject CBT",
      desc: "Schedule short, focused exams on any one subject — perfect for weekly drills.",
      accent: "orange",
      items: ["Custom duration", "Question bank with images", "Live scoreboard"],
    },
    {
      title: "Full JAMB combo",
      desc: "Four subjects, real UTME time pressure. Everything counts toward a combined score.",
      accent: "green",
      items: ["English + 3 electives", "Per-subject analytics", "One submission, one score"],
    },
    {
      title: "Product keys & trials",
      desc: "Issue access keys to your enrolled students, or run free trials for new prospects.",
      accent: "brick",
      items: ["Bulk key generation", "Trial expiry control", "Per-student tracking"],
    },
  ];
  return (
    <section id="services" className="py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
        <SectionHeader
          eyebrow="Services"
          title="Built for the way you actually teach"
          subtitle="From a 30-minute drill to a full UTME mock — pick the flow, we handle the rest."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {services.map((s) => {
            const c =
              s.accent === "orange" ? "var(--brand-orange)" :
              s.accent === "green" ? "var(--brand-green)" : "var(--brand-brick)";
            return (
              <div
                key={s.title}
                className="group relative rounded-2xl border bg-card p-7 shadow-sm hover:shadow-lg transition-all overflow-hidden"
              >
                <span
                  aria-hidden
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: c }}
                />
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                <ul className="mt-5 space-y-2.5">
                  {s.items.map((i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: c }} />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
function Testimonials() {
  const t = [
    { name: "Mrs. Adaeze O.", role: "Director, BrightPath Tutorial", initials: "AO", text: "Our students walked into UTME feeling like they'd already taken it. The live scoreboard makes mock days actually fun." },
    { name: "Tunde A.", role: "Maths tutor, Lagos", initials: "TA", text: "Setting up a 40-question exam takes minutes. The image upload for diagrams is exactly what I needed." },
    { name: "Chiamaka E.", role: "UTME candidate", initials: "CE", text: "I practiced four full combos before exam day. I scored 312. This platform is the reason." },
  ];
  const colors = ["var(--brand-orange)", "var(--brand-green)", "var(--brand-brick)"];
  return (
    <section id="testimonials" className="py-20 lg:py-28 bg-[var(--muted)]">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8">
        <SectionHeader
          eyebrow="Reviews"
          title="Loved by tutors and students"
          subtitle="Real classrooms across Nigeria use JAMB CBT every week."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {t.map((r, i) => (
            <figure key={r.name} className="rounded-2xl border bg-card p-7 shadow-sm hover:shadow-lg transition-shadow">
              <blockquote className="text-sm leading-relaxed text-foreground">"{r.text}"</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full grid place-items-center text-white font-semibold text-sm"
                  style={{ background: colors[i % colors.length] }}
                >
                  {r.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
function Faq() {
  const items = [
    { q: "Is this aligned to the JAMB UTME format?", a: "Yes — 4 subjects, English compulsory, with realistic timing and per-question shuffling." },
    { q: "Can I use this for a single-subject drill?", a: "Absolutely. Admins can schedule a single-subject exam with any duration and any subset of questions." },
    { q: "Do students need to install anything?", a: "No. Everything runs in the browser — phones, tablets, laptops or center desktops." },
    { q: "How are answers protected from cheating?", a: "Questions and options shuffle per student, progress is saved server-side, and the timer is enforced on submit." },
    { q: "Can I try it before paying?", a: "Yes. We support trial keys so new students can test the full flow before you issue a paid key." },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-5 lg:px-8">
        <SectionHeader
          eyebrow="FAQ"
          title="Frequently asked questions"
          subtitle="Can't find what you're looking for? Reach out below."
        />
        <div className="mt-12 space-y-3">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-medium hover:bg-muted/40 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{it.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{it.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Contact ---------- */
function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.includes("@") || form.message.trim().length < 10) {
      toast.error("Please fill in all fields correctly.");
      return;
    }
    toast.success("Thanks! We'll get back to you within 24 hours.");
    setForm({ name: "", email: "", message: "" });
  };
  return (
    <section id="contact" className="py-20 lg:py-28 bg-[var(--muted)]">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <SectionHeader
            align="left"
            eyebrow="Contact"
            title="Talk to us about your tutorial center"
            subtitle="Tell us a bit about your center and we'll get you onboarded fast."
          />
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex items-center gap-3"><Mail className="w-4 h-4 text-[var(--brand-orange)]" /> hello@jambcbt.app</li>
            <li className="flex items-center gap-3"><ShieldCheck className="w-4 h-4 text-[var(--brand-green)]" /> Onboarding in under 24 hours</li>
            <li className="flex items-center gap-3"><Sparkles className="w-4 h-4 text-[var(--brand-brick)]" /> Free pilot for new centers</li>
          </ul>
        </div>
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border bg-card p-6 lg:p-8 shadow-sm space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@center.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Tell us about your center, student count, and what you need."
              required
            />
          </div>
          <Button type="submit" className="w-full h-11 text-base shadow-sm">
            Send message
          </Button>
        </form>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="w-5 h-5" />
            </span>
            JAMB<span className="text-primary">CBT</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            The CBT practice platform Nigerian tutorial centers trust.
          </p>
          <div className="mt-5 flex gap-3">
            {[Twitter, Facebook, Instagram].map((I, i) => (
              <a key={i} href="#" aria-label="social" className="w-9 h-9 grid place-items-center rounded-lg border hover:bg-muted transition-colors">
                <I className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
        <FooterCol title="Product" links={[["Features", "#features"], ["Services", "#services"], ["Reviews", "#testimonials"]]} />
        <FooterCol title="Resources" links={[["FAQ", "#faq"], ["Contact", "#contact"]]} />
        <FooterCol title="Account" links={[["Log in", "/login"], ["Sign up", "/register"]]} routerLinks />
      </div>
      <div className="border-t">
        <div className="mx-auto max-w-[1280px] px-5 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} JAMB CBT. All rights reserved.</span>
          <span>Made with care for Nigerian classrooms.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links, routerLinks }: { title: string; links: [string, string][]; routerLinks?: boolean }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map(([label, href]) => (
          <li key={label}>
            {routerLinks ? (
              <Link to={href} className="text-muted-foreground hover:text-foreground">{label}</Link>
            ) : (
              <a href={href} className="text-muted-foreground hover:text-foreground">{label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Helpers ---------- */
function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[var(--brand-orange)]">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-4 text-base text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
