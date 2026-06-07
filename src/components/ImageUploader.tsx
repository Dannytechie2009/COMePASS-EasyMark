import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { uploadImage } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ImageUploader({
  value,
  onChange,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const res = await uploadImage(f);
      onChange(res.secure_url);
      toast.success("Image uploaded");
    } catch (err: any) {
      const msg = err?.message ?? "Upload failed";
      toast.error(
        msg.includes("Upload preset")
          ? "Cloudinary preset not configured. In your Cloudinary console, set the preset 'COMePASS' to Unsigned mode."
          : msg,
      );
    } finally {
      setBusy(false);
      if (e.target) e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-3">
          <img src={value} alt="Uploaded preview" className="h-24 w-24 rounded-lg border object-cover" />
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground break-all line-clamp-2 max-w-[260px]">{value}</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
                Replace
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange(undefined)} disabled={busy}>
                <X className="size-4 mr-1" /> Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground hover:bg-muted/60 hover:border-primary/40 transition-colors disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              <span>Uploading…</span>
            </>
          ) : (
            <>
              <Upload className="size-5" />
              <span className="font-medium text-foreground">Click to upload an image</span>
              <span className="text-xs">PNG, JPG up to 8MB</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        disabled={busy}
        className="sr-only"
      />
    </div>
  );
}
