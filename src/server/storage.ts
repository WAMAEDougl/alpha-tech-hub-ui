import { randomUUID } from "crypto";
import { BadRequestException } from "./http";
import { config } from "./config";

const MAX_BYTES = 5 * 1024 * 1024;

/** Identify an image by its first bytes. The browser-supplied type and file name can be faked, the bytes cannot. */
function sniff(b: Uint8Array): { ext: string; mime: string } | null {
  const is = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  if (is(0xff, 0xd8, 0xff)) return { ext: ".jpg", mime: "image/jpeg" };
  if (is(0x89, 0x50, 0x4e, 0x47)) return { ext: ".png", mime: "image/png" };
  if (is(0x47, 0x49, 0x46, 0x38)) return { ext: ".gif", mime: "image/gif" };
  if (is(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: ".webp", mime: "image/webp" };
  return null;
}

/**
 * Saves a product image and returns its public address.
 * Production: Vercel Blob (set BLOB_READ_WRITE_TOKEN, i.e. connect a Blob store to the project).
 * Development without a token: written to public/uploads so it works offline.
 */
export async function saveImage(file: File): Promise<{ url: string; filename: string }> {
  if (file.size > MAX_BYTES) throw new BadRequestException("Each image must be under 5 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) throw new BadRequestException("Only JPG, PNG, GIF or WebP images are allowed");
  const filename = `${randomUUID()}${kind.ext}`;

  if (config.get("BLOB_READ_WRITE_TOKEN")) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`products/${filename}`, new Blob([bytes], { type: kind.mime }), { access: "public", contentType: kind.mime });
    return { url: blob.url, filename };
  }
  if (process.env.NODE_ENV === "production") {
    throw new BadRequestException("Image storage is not set up yet. Connect a Vercel Blob store to this project.");
  }
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), bytes);
  return { url: `/uploads/${filename}`, filename };
}
