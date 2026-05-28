// Cloudinary unsigned upload helper.
// The preset MUST be set to "Unsigned" in the Cloudinary console — signed
// presets cannot be used from the browser without a backend signature.
// API key / secret are NEVER used here and must never be added to client code.

export const CLOUDINARY_CLOUD_NAME = "dtbx0zsed";
export const CLOUDINARY_UPLOAD_PRESET = "COMePASS";

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export async function uploadImage(file: File): Promise<CloudinaryUploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${text}`);
  }
  return (await res.json()) as CloudinaryUploadResult;
}
