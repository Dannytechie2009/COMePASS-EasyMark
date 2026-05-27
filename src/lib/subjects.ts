export type Department = "science" | "commercial" | "art";

export const DEPARTMENTS: { id: Department; label: string }[] = [
  { id: "science", label: "Science" },
  { id: "commercial", label: "Commercial" },
  { id: "art", label: "Art" },
];

export const ALL_SUBJECTS = [
  "English",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Commerce",
  "Economics",
  "Financial Accounting",
  "Government",
  "Literature",
  "CRS",
] as const;

export type Subject = (typeof ALL_SUBJECTS)[number];

// Compulsory subjects per department + the pool the student picks the rest from.
export const DEPARTMENT_RULES: Record<
  Department,
  { required: Subject[]; pickFrom: Subject[]; pickCount: number; note: string }
> = {
  science: {
    required: ["English", "Physics", "Chemistry"],
    pickFrom: ["Biology", "Mathematics"],
    pickCount: 1,
    note: "Pick one: Biology or Mathematics",
  },
  commercial: {
    required: ["English", "Mathematics"],
    pickFrom: ["Commerce", "Economics", "Financial Accounting"],
    pickCount: 2,
    note: "Pick any two of Commerce, Economics, Financial Accounting",
  },
  art: {
    required: ["English", "Government", "Literature", "CRS"],
    pickFrom: [],
    pickCount: 0,
    note: "All four subjects are fixed",
  },
};

export function validateCombination(
  department: Department,
  subjects: Subject[],
): { ok: true } | { ok: false; reason: string } {
  const rule = DEPARTMENT_RULES[department];
  const unique = Array.from(new Set(subjects));
  if (unique.length !== 4) return { ok: false, reason: "You must select exactly 4 subjects" };

  for (const r of rule.required) {
    if (!unique.includes(r)) return { ok: false, reason: `${r} is required for ${department}` };
  }
  const picks = unique.filter((s) => rule.pickFrom.includes(s));
  if (picks.length !== rule.pickCount) {
    return { ok: false, reason: rule.note };
  }
  const extras = unique.filter(
    (s) => !rule.required.includes(s) && !rule.pickFrom.includes(s),
  );
  if (extras.length > 0) {
    return { ok: false, reason: `${extras[0]} is not allowed for ${department}` };
  }
  return { ok: true };
}

export function generateStudentId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing 0/O/I/1
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `JMB-${out}`;
}
