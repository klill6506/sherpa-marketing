import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuid } from "uuid";

const UPLOAD_DIR = join(process.cwd(), "uploads");

export interface StorageResult {
  url: string;
  filename: string;
  sizeBytes: number;
}

/**
 * Local file storage for dev. Design supports swapping to S3-compatible later.
 */
export async function uploadFile(
  file: Buffer,
  originalName: string,
  mimeType: string
): Promise<StorageResult> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = originalName.split(".").pop() || "bin";
  const filename = `${uuid()}.${ext}`;
  const filePath = join(UPLOAD_DIR, filename);

  await writeFile(filePath, file);

  return {
    url: `/api/media/file/${filename}`,
    filename,
    sizeBytes: file.length,
  };
}
