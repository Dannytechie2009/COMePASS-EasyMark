import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  announcementVisibleTo,
  listenAnnouncements,
  listenReadIds,
  markAnnouncementRead,
  type Announcement,
} from "@/lib/announcements";

export const Route = createFileRoute("/_authenticated/student/announcements")({
  component: StudentAnnouncementsPage,
});

function StudentAnnouncementsPage() {
  const { profile } = useAuth();
  if (profile && profile.role !== "student") return <Navigate to="/admin" />;

  const [all, setAll] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => listenAnnouncements(setAll), []);
  useEffect(() => profile?.uid ? listenReadIds(profile.uid, setReadIds) : undefined, [profile?.uid]);

  const visible = useMemo(
    () => all.filter((a) => announcementVisibleTo(a, profile?.department, profile?.subjects)),
    [all, profile?.department, profile?.subjects],
  );

  // Auto-mark visible items as read.
  useEffect(() => {
    if (!profile?.uid) return;
    visible.forEach((a) => {
      if (!readIds.has(a.id)) markAnnouncementRead(profile.uid, a.id).catch(() => {});
    });
  }, [visible, readIds, profile?.uid]);

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 text-primary p-2.5"><Megaphone className="size-5" /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Updates from your tutors and the COMePASS team.</p>
        </div>
      </header>

      {visible.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          You're all caught up — no announcements yet.
        </div>
      )}

      <div className="grid gap-3">
        {visible.map((a) => {
          const unread = !readIds.has(a.id);
          return (
            <article key={a.id} className={`rounded-2xl border bg-card p-4 shadow-sm space-y-2 ${unread ? "ring-2 ring-primary/30" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{a.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    by {a.createdByName ?? "Admin"}
                    {a.createdAt?.toDate && ` · ${a.createdAt.toDate().toLocaleString()}`}
                  </p>
                </div>
                {unread && <span className="text-[10px] uppercase tracking-wider bg-secondary/15 text-secondary px-2 py-0.5 rounded-full">New</span>}
              </div>
              {a.imageUrl && <img src={a.imageUrl} alt="" className="rounded-lg max-h-72 object-cover w-full" />}
              <p className="text-sm whitespace-pre-wrap">{a.body}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
