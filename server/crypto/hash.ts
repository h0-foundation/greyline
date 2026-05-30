import { createHash } from "crypto";

/** SHA-256 of a buffer or string, lowercase hex. Used as the chain-of-custody
 *  integrity anchor for case-file evidence (computed at intake). */
export function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}
