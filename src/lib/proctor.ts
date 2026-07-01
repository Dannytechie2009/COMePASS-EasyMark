import { useEffect, useRef } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb } from "./firebase";
import { toast } from "sonner";

export type ViolationKind =
  | "tab_switch"
  | "window_blur"
  | "fullscreen_exit"
  | "copy"
  | "paste"
  | "cut"
  | "context_menu"
  | "page_hidden"
  | "refresh_attempt"
  | "devtools_shortcut";

export interface ProctorOptions {
  sessionId: string;
  attemptId: string;
  uid: string;
  studentName: string;
  enabled: boolean;
  onCounts?: (counts: Record<ViolationKind, number>) => void;
}

async function logViolation(
  sessionId: string,
  attemptId: string,
  uid: string,
  studentName: string,
  kind: ViolationKind,
) {
  try {
    await addDoc(collection(getDb(), "examSessions", sessionId, "violations"), {
      attemptId,
      uid,
      studentName,
      kind,
      at: serverTimestamp(),
    });
  } catch (e) {
    console.warn("violation log failed", e);
  }
}

const WARNINGS: Partial<Record<ViolationKind, string>> = {
  tab_switch: "Leaving the tab has been recorded.",
  window_blur: "You switched away from the exam window.",
  fullscreen_exit: "Fullscreen exited — please return to fullscreen.",
  copy: "Copying is not allowed during exams.",
  paste: "Pasting is not allowed during exams.",
  cut: "Cutting content is not allowed.",
  context_menu: "Right-click is disabled during exams.",
  devtools_shortcut: "Developer tools shortcuts are blocked.",
};

export function useExamProctor(opts: ProctorOptions) {
  const countsRef = useRef<Record<ViolationKind, number>>({
    tab_switch: 0,
    window_blur: 0,
    fullscreen_exit: 0,
    copy: 0,
    paste: 0,
    cut: 0,
    context_menu: 0,
    page_hidden: 0,
    refresh_attempt: 0,
    devtools_shortcut: 0,
  });

  useEffect(() => {
    if (!opts.enabled) return;
    const { sessionId, attemptId, uid, studentName, onCounts } = opts;

    const fire = (kind: ViolationKind, silent = false) => {
      countsRef.current[kind] = (countsRef.current[kind] ?? 0) + 1;
      onCounts?.({ ...countsRef.current });
      if (!silent && WARNINGS[kind]) toast.warning(WARNINGS[kind]!);
      void logViolation(sessionId, attemptId, uid, studentName, kind);
    };

    const onVisibility = () => {
      if (document.hidden) fire("tab_switch");
    };
    const onBlur = () => fire("window_blur", true);
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); fire("copy"); };
    const onPaste = (e: ClipboardEvent) => { e.preventDefault(); fire("paste"); };
    const onCut = (e: ClipboardEvent) => { e.preventDefault(); fire("cut"); };
    const onContext = (e: MouseEvent) => { e.preventDefault(); fire("context_menu"); };
    const onFsChange = () => { if (!document.fullscreenElement) fire("fullscreen_exit"); };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      fire("refresh_attempt", true);
      e.preventDefault();
      e.returnValue = "";
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === "F12") { e.preventDefault(); fire("devtools_shortcut"); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k)) {
        e.preventDefault();
        fire("devtools_shortcut");
      }
      if ((e.ctrlKey || e.metaKey) && k === "u") { e.preventDefault(); fire("devtools_shortcut"); }
      if ((e.ctrlKey || e.metaKey) && k === "r") { e.preventDefault(); fire("refresh_attempt"); }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("fullscreenchange", onFsChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("fullscreenchange", onFsChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("keydown", onKey);
    };
  }, [opts.enabled, opts.sessionId, opts.attemptId, opts.uid, opts.studentName]);
}

export async function requestFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    /* user may deny */
  }
}
