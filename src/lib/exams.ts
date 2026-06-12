import type { Department, Subject } from "./subjects";
import type { Timestamp } from "firebase/firestore";

export interface Question {
  id: string;
  subject: Subject;
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation?: string;
  imageUrl?: string;
  topicId?: string | null;
  topicTitle?: string | null;
  createdBy: string;
  createdAt?: Timestamp;
}

export type ExamStatus = "scheduled" | "live" | "ended" | "corrections_open";
export type ExamMode = "single" | "combo";
export type ExamType = "utme" | "post_utme";
export type KeyMode = "shared" | "individual";

export type SubjectQuestionMap = Partial<Record<Subject, string[]>>;

// Audience targeting. Default (undefined) = all eligible students.
export interface TargetScope {
  kind: "all" | "departments";
  departments?: Department[];
}

export interface ExamSession {
  id: string;
  title: string;
  examType?: ExamType; // defaults to 'utme' when missing
  mode: ExamMode;
  subject?: Subject;
  subjects?: Subject[];
  subjectQuestionMap?: SubjectQuestionMap;
  questionIds: string[];
  durationMinutes: number; // per-student time limit
  /** Window (minutes) the exam stays open from startAt. Falls back to durationMinutes. */
  availabilityMinutes?: number;
  requiresProductKey?: boolean;
  keyMode?: KeyMode;
  productKey?: string;
  individualKeyCount?: number;
  targetScope?: TargetScope;
  startAt: Timestamp;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  status: ExamStatus;
  createdBy: string;
  createdAt?: Timestamp;
}

export interface Attempt {
  id: string;
  sessionId: string;
  uid: string;
  studentName: string;
  studentIdShort?: string;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  answers: Record<string, number>;
  questionOrder: string[];
  optionOrder?: Record<string, number[]>;
  submitted: boolean;
  autoSubmitted?: boolean;
  score?: number;
  totalPossible?: number;
  breakdown?: Partial<Record<Subject, { score: number; total: number }>>;
  productKeyUsed?: string | null;
}

export function attemptId(sessionId: string, uid: string) {
  return `${sessionId}_${uid}`;
}

export function getSessionSubjects(session: Pick<ExamSession, "mode" | "subject" | "subjects" | "subjectQuestionMap">) {
  if (session.mode === "single") return session.subject ? [session.subject] : [];
  const fromSubjects = session.subjects ?? [];
  if (fromSubjects.length > 0) return fromSubjects;
  return Object.keys(session.subjectQuestionMap ?? {}) as Subject[];
}

export function sessionMatchesStudent(
  session: Pick<ExamSession, "mode" | "subject" | "subjects" | "subjectQuestionMap" | "examType" | "targetScope">,
  studentSubjects: Subject[],
  studentDepartment?: Department,
) {
  // Targeting always takes precedence when set.
  if (session.targetScope) {
    if (session.targetScope.kind === "departments") {
      if (!studentDepartment || !session.targetScope.departments?.includes(studentDepartment)) return false;
    }
    // 'all' falls through to subject check below for UTME; for post_utme it's automatic match.
    if (session.examType === "post_utme") return true;
  } else if (session.examType === "post_utme") {
    // Untargeted post_utme = open to all students.
    return true;
  }

  // UTME (default): strict subject-combo match.
  const sessionSubjects = getSessionSubjects(session);
  if (session.mode === "single") return sessionSubjects.some((subject) => studentSubjects.includes(subject));
  if (sessionSubjects.length === 0) return false;
  return sessionSubjects.every((subject) => studentSubjects.includes(subject));
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function computeStatus(s: { status: ExamStatus; startAt: Timestamp; durationMinutes: number; availabilityMinutes?: number }): ExamStatus {
  if (s.status === "corrections_open" || s.status === "ended") return s.status;
  const start = s.startAt.toMillis();
  const windowMinutes = s.availabilityMinutes ?? s.durationMinutes;
  const end = start + windowMinutes * 60_000;
  const now = Date.now();
  if (now < start) return "scheduled";
  if (now < end) return "live";
  return "ended";
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatDurationFromMs(ms: number) {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
