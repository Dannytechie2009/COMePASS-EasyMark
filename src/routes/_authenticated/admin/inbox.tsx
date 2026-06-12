import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Inbox, Mail, Check, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  listenContactMessages,
  markMessageRead,
  deleteMessage,
  type ContactMessage,
} from "@/lib/contact";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/inbox")({
  component: InboxPage,
});

function InboxPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  useEffect(() => listenContactMessages(setMessages), []);

  if (profile && profile.role !== "super_admin") {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <Inbox className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-3 text-lg font-semibold">Super admin only</h2>
        <p className="text-sm text-muted-foreground">Inbox messages are private to super admins.</p>
      </div>
    );
  }

  const unread = messages.filter((m) => !m.read).length;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border bg-card p-6 shadow-sm flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 text-primary p-2.5"><Inbox className="size-5" /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Contact inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {messages.length} message{messages.length === 1 ? "" : "s"} · {unread} unread
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No messages yet. Submissions from the public contact form will land here.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl border p-5 shadow-sm space-y-3 ${!m.read ? "bg-primary/5 border-primary/30" : "bg-card"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  {m.name}
                  {!m.read && <span className="text-[10px] uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">New</span>}
                </div>
                <a href={`mailto:${m.email}`} className="text-sm text-primary hover:underline">{m.email}</a>
              </div>
              <span className="text-xs text-muted-foreground">
                {m.createdAt?.toDate().toLocaleString()}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{m.message}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try { await markMessageRead(m.id, !m.read); } catch (e: any) { toast.error(e.message); }
                }}
              >
                <Check className="size-3.5" /> Mark {m.read ? "unread" : "read"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={async () => {
                  if (!confirm("Delete this message?")) return;
                  try { await deleteMessage(m.id); toast.success("Deleted"); } catch (e: any) { toast.error(e.message); }
                }}
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
