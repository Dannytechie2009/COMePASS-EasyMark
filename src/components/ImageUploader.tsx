import { useState } from "react";
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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const res = await uploadImage(f);
      onChange(res.secure_url);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-start gap-3">
          <img src={value} alt="" className="h-24 w-24 rounded border object-cover" />
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Remove
          </Button>
        </div>
      )}
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="file" accept="image/*" onChange={handleFile} disabled={busy} className="block text-sm" />
        {busy && <span className="text-muted-foreground">Uploading…</span>}
      </label>
    </div>
  );
}
