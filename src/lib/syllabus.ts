import { collection, doc, getDocs, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "./firebase";
import type { Subject } from "./subjects";

export interface Topic {
  id: string;
  subject: Subject;
  title: string;
  description?: string;
  studyTips?: string;
  createdBy: string;
  createdAt?: any;
}

export function listenTopicsBySubject(subject: Subject, cb: (topics: Topic[]) => void) {
  const q = query(collection(getDb(), "topics"), where("subject", "==", subject));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Topic[];
    list.sort((a, b) => a.title.localeCompare(b.title));
    cb(list);
  });
}

export async function fetchTopicsBySubject(subject: Subject): Promise<Topic[]> {
  const q = query(collection(getDb(), "topics"), where("subject", "==", subject));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Topic[];
}

export async function createTopic(t: Omit<Topic, "id" | "createdAt">) {
  return addDoc(collection(getDb(), "topics"), { ...t, createdAt: serverTimestamp() });
}

export async function updateTopic(id: string, patch: Partial<Omit<Topic, "id">>) {
  return updateDoc(doc(getDb(), "topics", id), patch as any);
}

export async function deleteTopic(id: string) {
  return deleteDoc(doc(getDb(), "topics", id));
}
