import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  getDocs,
} from "firebase/firestore";
import { getDb } from "./firebase";

export interface Review {
  id: string;
  sessionId: string;
  sessionTitle?: string;
  uid: string;
  studentName: string;
  rating: number; // 1-5
  comment: string;
  createdAt?: Timestamp;
}

export async function createReview(r: Omit<Review, "id" | "createdAt">) {
  return addDoc(collection(getDb(), "reviews"), { ...r, createdAt: serverTimestamp() });
}

export function listenReviewsForSession(sessionId: string, cb: (list: Review[]) => void) {
  const q = query(
    collection(getDb(), "reviews"),
    where("sessionId", "==", sessionId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}

export async function hasReviewed(sessionId: string, uid: string) {
  const snap = await getDocs(
    query(collection(getDb(), "reviews"), where("sessionId", "==", sessionId), where("uid", "==", uid)),
  );
  return !snap.empty;
}
