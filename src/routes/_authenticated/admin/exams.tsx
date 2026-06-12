import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { ALL_SUBJECTS, DEPARTMENTS, POST_UTME_ONLY_SUBJECTS, type Department, type Subject } from "@/lib/subjects";
import type { ExamMode, ExamSession, ExamType, KeyMode, Question, SubjectQuestionMap, TargetScope } from "@/lib/exams";
import { computeStatus, getSessionSubjects } from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/exams")({
  component: ExamsPage,
});

function ExamsPage() {
  const { profile } = useAuth();
  if (profile && profile.role === "student") return <Navigate to="/student" />;

  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(getDb(), "examSessions"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (s) => setSessions(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exam sessions</h1>
        <Button onClick={() => setCreating(true)}>+ New exam</Button>
      </div>

      {creating && <CreateExam onClose={() => setCreating(false)} createdBy={profile!.uid} />}

      <div className="space-y-3">
        {sessions.length === 0 && <p className="text-sm text-muted-foreground">No exams yet.</p>}
        {sessions.map((s) => {
          const status = computeStatus(s);
          const subjects = getSessionSubjects(s).join(" + ") || "—";
          return (
            <Link
              key={s.id}
              to="/admin/exams/$sessionId"
              params={{ sessionId: s.id }}
              className="block rounded-lg border p-4 hover:bg-accent transition-colors"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {s.title}
                    {s.mode === "combo" && <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">Combo</span>}
                    {s.requiresProductKey && <span className="text-[10px] uppercase tracking-wider bg-secondary/15 text-secondary px-2 py-0.5 rounded-full">Key</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {subjects} · {s.questionIds.length} questions · {s.durationMinutes} min
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Starts {s.startAt.toDate().toLocaleString()}
                  </div>
                </div>
                <StatusPill status={status} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    live: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    ended: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    corrections_open: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  };
  return <span className={`text-xs px-2 py-1 rounded-full h-fit ${colors[status]}`}>{status.replace("_", " ")}</span>;
}

function randomKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function CreateExam({ onClose, createdBy }: { onClose: () => void; createdBy: string }) {
  const [examType, setExamType] = useState<ExamType>("utme");
  const [mode, setMode] = useState<ExamMode>("single");
  const [title, setTitle] = useState("");
  const [singleSubject, setSingleSubject] = useState<Subject>("English");
  const [comboSubjects, setComboSubjects] = useState<Subject[]>(["English", "Mathematics", "Physics", "Chemistry"]);
  const [bank, setBank] = useState<Record<Subject, Question[]>>({} as Record<Subject, Question[]>);
  const [selectedBySubject, setSelectedBySubject] = useState<Record<Subject, Set<string>>>({} as Record<Subject, Set<string>>);
  const [duration, setDuration] = useState(30);
  const [availability, setAvailability] = useState(180); // minutes the window stays open
  const [startAt, setStartAt] = useState(() => {
    const d = new Date(Date.now() + 5 * 60_000);
    d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [requireKey, setRequireKey] = useState(false);
  const [keyMode, setKeyMode] = useState<KeyMode>("shared");
  const [productKey, setProductKey] = useState("");
  const [individualCount, setIndividualCount] = useState(20);
  const [audienceAll, setAudienceAll] = useState(true);
  const [audienceDepts, setAudienceDepts] = useState<Department[]>([]);
  const [busy, setBusy] = useState(false);

  // Subject list shown depends on exam type. POST-UTME adds GK & Current Affairs.
  const subjectPool = useMemo<readonly Subject[]>(
    () => examType === "post_utme"
      ? ALL_SUBJECTS
      : ALL_SUBJECTS.filter((s) => !POST_UTME_ONLY_SUBJECTS.includes(s)),
    [examType],
  );

  const activeSubjects = useMemo<Subject[]>(
    () => (mode === "single" ? [singleSubject] : comboSubjects),
    [mode, singleSubject, comboSubjects],
  );

  // Load questions for any active subject not yet loaded
  useEffect(() => {
    (async () => {
      const missing = activeSubjects.filter((s) => !bank[s]);
      if (missing.length === 0) return;
      const fetched: Record<string, Question[]> = {};
      for (const subj of missing) {
        const snap = await getDocs(
          query(collection(getDb(), "questions"), where("subject", "==", subj)),
        );
        fetched[subj] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Question[];
      }
      setBank((prev) => ({ ...prev, ...fetched }));
    })();
  }, [activeSubjects, bank]);

  function toggleQ(subj: Subject, id: string) {
    setSelectedBySubject((prev) => {
      const cur = new Set(prev[subj] ?? []);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      return { ...prev, [subj]: cur };
    });
  }

  function selectAll(subj: Subject) {
    setSelectedBySubject((prev) => {
      const all = new Set((bank[subj] ?? []).map((q) => q.id));
      const cur = prev[subj] ?? new Set();
      return { ...prev, [subj]: cur.size === all.size ? new Set() : all };
    });
  }

  function toggleComboSubject(s: Subject) {
    setComboSubjects((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      // POST-UTME allows free combos (no 4-cap); UTME keeps the strict cap of 4.
      if (examType === "utme" && prev.length >= 4) {
        toast.error("UTME combo exams allow up to 4 subjects");
        return prev;
      }
      return [...prev, s];
    });
  }

  function toggleAudienceDept(d: Department) {
    setAudienceDepts((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  async function save() {
    if (!title.trim()) return toast.error("Title required");
    if (examType === "utme" && mode === "combo" && comboSubjects.length !== 4)
      return toast.error("Pick exactly 4 subjects for a UTME combo exam");
    if (examType === "post_utme" && mode === "combo" && comboSubjects.length < 1)
      return toast.error("Pick at least one subject for the POST-UTME exam");
    if (requireKey && keyMode === "shared" && !productKey.trim()) return toast.error("Set a shared key or switch mode");
    if (requireKey && keyMode === "individual" && (individualCount < 1 || individualCount > 500)) {
      return toast.error("Individual key count must be between 1 and 500");
    }
    if (!audienceAll && audienceDepts.length === 0)
      return toast.error("Pick at least one department, or switch to 'All students'");

    const subjectQuestionMap: SubjectQuestionMap = {};
    let questionIds: string[] = [];
    for (const subj of activeSubjects) {
      const ids = Array.from(selectedBySubject[subj] ?? []);
      if (ids.length === 0) return toast.error(`Pick at least one question for ${subj}`);
      subjectQuestionMap[subj] = ids;
      questionIds = questionIds.concat(ids);
    }

    setBusy(true);
    try {
      const targetScope: TargetScope = audienceAll
        ? { kind: "all" }
        : { kind: "departments", departments: audienceDepts };

      const payload: any = {
        title: title.trim(),
        examType,
        mode,
        questionIds,
        durationMinutes: duration,
        availabilityMinutes: Math.max(duration, availability),
        startAt: Timestamp.fromDate(new Date(startAt)),
        shuffleQuestions,
        shuffleOptions,
        status: "scheduled",
        createdBy,
        createdAt: serverTimestamp(),
        requiresProductKey: requireKey,
        targetScope,
      };
      if (requireKey) {
        payload.keyMode = keyMode;
        if (keyMode === "shared") payload.productKey = productKey.trim();
        else payload.individualKeyCount = individualCount;
      }
      if (mode === "single") {
        payload.subject = singleSubject;
      } else {
        payload.subjects = comboSubjects;
        payload.subjectQuestionMap = subjectQuestionMap;
      }
      const ref = await addDoc(collection(getDb(), "examSessions"), payload);

      // Pre-generate individual keys as a subcollection
      if (requireKey && keyMode === "individual") {
        const used = new Set<string>();
        const writes: Promise<unknown>[] = [];
        while (used.size < individualCount) {
          const k = randomKey();
          if (used.has(k)) continue;
          used.add(k);
          writes.push(
            setDoc(doc(getDb(), "examSessions", ref.id, "productKeys", k), {
              value: k,
              used: false,
              usedBy: null,
              usedAt: null,
              createdAt: serverTimestamp(),
            }),
          );
        }
        await Promise.all(writes);
      }

      toast.success("Exam scheduled");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border p-5 space-y-5 bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-lg">New exam</h2>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-lg border p-1 text-xs">
            <button type="button" onClick={() => setExamType("utme")}
              className={`px-3 py-1.5 rounded-md ${examType === "utme" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>UTME</button>
            <button type="button" onClick={() => setExamType("post_utme")}
              className={`px-3 py-1.5 rounded-md ${examType === "post_utme" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>POST-UTME</button>
          </div>
          <div className="inline-flex rounded-lg border p-1 text-xs">
            <button type="button" onClick={() => setMode("single")}
              className={`px-3 py-1.5 rounded-md ${mode === "single" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Single subject</button>
            <button type="button" onClick={() => setMode("combo")}
              className={`px-3 py-1.5 rounded-md ${mode === "combo" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {examType === "utme" ? "JAMB combo (4)" : "Multi-subject"}
            </button>
          </div>
        </div>
      </div>

      {examType === "post_utme" && (
        <p className="text-xs rounded-lg bg-secondary/10 border border-secondary/30 text-secondary-foreground px-3 py-2">
          POST-UTME mode: pick any subjects (including General Knowledge & Current Affairs). Strict UTME combinations are not enforced.
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-2 sm:col-span-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. JAMB Mock — Science" />
        </div>

        {mode === "single" ? (
          <div className="space-y-2">
            <Label>Subject</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={singleSubject}
              onChange={(e) => setSingleSubject(e.target.value as Subject)}
            >
              {subjectPool.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        ) : (
          <div className="space-y-2 sm:col-span-2">
            <Label>Subjects ({comboSubjects.length}{examType === "utme" ? "/4" : ""})</Label>
            <div className="flex flex-wrap gap-2">
              {subjectPool.map((s) => {
                const on = comboSubjects.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleComboSubject(s)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                  >{s}</button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Per-student time limit (min)</Label>
          <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          <p className="text-[11px] text-muted-foreground">Each candidate's countdown once they start.</p>
        </div>
        <div className="space-y-2">
          <Label>Availability window (min)</Label>
          <Input type="number" min={duration} value={availability} onChange={(e) => setAvailability(Number(e.target.value))} />
          <p className="text-[11px] text-muted-foreground">How long the exam stays open from the start time.</p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Start at</Label>
          <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <Checkbox checked={shuffleQuestions} onCheckedChange={(v) => setShuffleQuestions(!!v)} /> Shuffle questions
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={shuffleOptions} onCheckedChange={(v) => setShuffleOptions(!!v)} /> Shuffle options
        </label>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <Label className="text-sm font-medium">Who can take this exam?</Label>
        <div className="inline-flex rounded-lg border p-1 text-xs">
          <button type="button" onClick={() => setAudienceAll(true)}
            className={`px-3 py-1.5 rounded-md ${audienceAll ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>All eligible students</button>
          <button type="button" onClick={() => setAudienceAll(false)}
            className={`px-3 py-1.5 rounded-md ${!audienceAll ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Specific departments</button>
        </div>
        {!audienceAll && (
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map((d) => {
              const on = audienceDepts.includes(d.id);
              return (
                <button key={d.id} type="button" onClick={() => toggleAudienceDept(d.id)}
                  className={`rounded-full border px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                  {d.label}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {examType === "post_utme"
            ? "POST-UTME ignores strict subject combos — choose one or more departments, or open it to everyone."
            : "UTME also checks the student's subject combination matches the exam."}
        </p>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox checked={requireKey} onCheckedChange={(v) => setRequireKey(!!v)} />
          Require a product key (PIN) to start this exam
        </label>
        {requireKey && (
          <>
            <div className="inline-flex rounded-lg border p-1 text-xs">
              <button
                type="button"
                onClick={() => setKeyMode("shared")}
                className={`px-3 py-1.5 rounded-md ${keyMode === "shared" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >Shared PIN (one for everyone)</button>
              <button
                type="button"
                onClick={() => setKeyMode("individual")}
                className={`px-3 py-1.5 rounded-md ${keyMode === "individual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >Individual PINs (one per candidate)</button>
            </div>

            {keyMode === "shared" ? (
              <div className="space-y-2">
                <div className="grid sm:grid-cols-[1fr_auto] gap-2">
                  <Input
                    value={productKey}
                    onChange={(e) => setProductKey(e.target.value.toUpperCase())}
                    placeholder="Set a PIN every student will enter"
                    className="font-mono tracking-wider"
                  />
                  <Button type="button" variant="outline" onClick={() => setProductKey(randomKey())}>Generate</Button>
                </div>
                <p className="text-xs text-muted-foreground">All students sit this exam with the same PIN — share it with the department.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs">Number of candidates</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={individualCount}
                  onChange={(e) => setIndividualCount(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">A unique PIN is generated per candidate. Each PIN works for one student only. View &amp; print them from the exam detail page after creation.</p>
              </div>
            )}
          </>
        )}
      </div>

      {activeSubjects.map((subj) => {
        const pool = bank[subj] ?? [];
        const sel = selectedBySubject[subj] ?? new Set();
        return (
          <div key={subj} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{subj} — pick questions ({sel.size}/{pool.length})</Label>
              {pool.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => selectAll(subj)}>
                  {sel.size === pool.length ? "Clear" : "Select all"}
                </Button>
              )}
            </div>
            <div className="max-h-56 overflow-auto rounded-md border divide-y">
              {pool.length === 0 && <p className="p-3 text-sm text-muted-foreground">No questions in {subj}. Add some first.</p>}
              {pool.map((q, i) => (
                <label key={q.id} className="flex items-start gap-2 p-3 text-sm cursor-pointer hover:bg-accent">
                  <Checkbox checked={sel.has(q.id)} onCheckedChange={() => toggleQ(subj, q.id)} />
                  <span><span className="text-muted-foreground">{i + 1}.</span> {q.text}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex gap-2">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Schedule exam"}</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
