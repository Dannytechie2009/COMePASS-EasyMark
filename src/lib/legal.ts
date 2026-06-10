import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "./firebase";

export type LegalKind = "privacy" | "terms";

export interface LegalDoc {
  body: string;
  version: number;
  updatedAt?: any;
  updatedBy?: string;
}

export function legalRef(kind: LegalKind) {
  return doc(getDb(), "legal", kind);
}

export function listenLegal(kind: LegalKind, cb: (doc: LegalDoc | null) => void) {
  return onSnapshot(legalRef(kind), (s) => cb(s.exists() ? (s.data() as LegalDoc) : null));
}

export async function fetchLegal(kind: LegalKind): Promise<LegalDoc | null> {
  const s = await getDoc(legalRef(kind));
  return s.exists() ? (s.data() as LegalDoc) : null;
}

export async function saveLegal(kind: LegalKind, body: string, updatedBy: string) {
  const existing = await fetchLegal(kind);
  const version = (existing?.version ?? 0) + 1;
  await setDoc(legalRef(kind), {
    body,
    version,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
  return version;
}
