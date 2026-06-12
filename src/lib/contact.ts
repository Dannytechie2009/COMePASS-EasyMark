import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "./firebase";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  read?: boolean;
  createdAt?: Timestamp;
}

export async function sendContactMessage(m: Omit<ContactMessage, "id" | "createdAt" | "read">) {
  return addDoc(collection(getDb(), "contactMessages"), {
    ...m,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export function listenContactMessages(cb: (list: ContactMessage[]) => void) {
  const q = query(collection(getDb(), "contactMessages"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}

export async function markMessageRead(id: string, read = true) {
  return updateDoc(doc(getDb(), "contactMessages", id), { read });
}

export async function deleteMessage(id: string) {
  return deleteDoc(doc(getDb(), "contactMessages", id));
}
