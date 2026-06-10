import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { Department, Subject } from "./subjects";

export interface AnnouncementAudience {
  kind: "all" | "targeted";
  departments?: Department[];
  subjects?: Subject[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  audience: AnnouncementAudience;
  createdBy: string;
  createdByName?: string;
  createdAt?: Timestamp;
}

export function listenAnnouncements(cb: (list: Announcement[]) => void) {
  const q = query(collection(getDb(), "announcements"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}

export async function createAnnouncement(a: Omit<Announcement, "id" | "createdAt">) {
  return addDoc(collection(getDb(), "announcements"), { ...a, createdAt: serverTimestamp() });
}

export async function deleteAnnouncement(id: string) {
  return deleteDoc(doc(getDb(), "announcements", id));
}

export function announcementVisibleTo(
  a: Announcement,
  department?: Department,
  subjects?: Subject[],
) {
  if (a.audience.kind === "all") return true;
  const okDept = !a.audience.departments?.length || (department && a.audience.departments.includes(department));
  const okSubj =
    !a.audience.subjects?.length || (subjects && a.audience.subjects.some((s) => subjects.includes(s)));
  return Boolean(okDept && okSubj);
}

// Read receipts stored at users/{uid}/readAnnouncements/{aid}
export async function markAnnouncementRead(uid: string, announcementId: string) {
  return setDoc(
    doc(getDb(), "users", uid, "readAnnouncements", announcementId),
    { readAt: serverTimestamp() },
    { merge: true },
  );
}

export function listenReadIds(uid: string, cb: (ids: Set<string>) => void) {
  return onSnapshot(collection(getDb(), "users", uid, "readAnnouncements"), (snap) => {
    cb(new Set(snap.docs.map((d) => d.id)));
  });
}
