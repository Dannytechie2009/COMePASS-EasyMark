import type { Subject } from "./subjects";
import type { Timestamp } from "firebase/firestore";

export interface Question {
  id: string;
  subject: Subject;
  text: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation?: string;
  imageUrl?: string;
  createdBy: string;
  createdAt?: Timestamp;
}

export type ExamStatus = "scheduled" | "live" | "ended" | "corrections_open";

export interface ExamSession {
  id: string;
  title: string;
  mode: "single";
  subject: Subject;
  questionIds: string[];
  durationMinutes: number;
  startAt: Timestamp;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  status: ExamStatus;
  createdBy: string;
  createdAt?: Timestamp;
}

export interface Attempt {
  id: string; // sessionId_uid
  sessionId: string;
  uid: string;
  studentName: string;
  studentIdShort?: string;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  answers: Record<string, number>; // questionId -> chosen option index
  questionOrder: string[]; // persisted shuffle
  optionOrder?: Record<string, number[]>; // per-question option permutation
  submitted: boolean;
  autoSubmitted?: boolean;
  score?: number;
  totalPossible?: number;
}

export function attemptId(sessionId: string, uid: string) {
  return `${sessionId}_${uid}`;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function computeStatus(s: { status: ExamStatus; startAt: Timestamp; durationMinutes: number }): ExamStatus {
  if (s.status === "corrections_open" || s.status === "ended") return s.status;
  const start = s.startAt.toMillis();
  const end = start + s.durationMinutes * 60_000;
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
