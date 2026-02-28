// stable hash for job descriptions
import crypto from "crypto";

export function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}