import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { MEAL_MEDIA_MAX_BYTES, type MealMediaType } from "./media.ts";

export type StoredMealImage = {
  objectId: string;
  mediaType: MealMediaType;
  sizeBytes: number;
};

export type MealImageStore = {
  save(userId: string, draftId: string, mediaType: MealMediaType, bytes: Buffer): Promise<StoredMealImage>;
  /** Trusted server-side read used by the configured AI provider. */
  read(objectId: string): Promise<{ bytes: Buffer; mediaType: MealMediaType }>;
  /** Owner-scoped read used by authenticated client media restore. */
  readForUser(userId: string, accessToken: string | undefined, objectId: string): Promise<{ bytes: Buffer; mediaType: MealMediaType }>;
  delete?(objectId: string): Promise<void>;
};

const extensionFor = (mediaType: MealMediaType): string =>
  mediaType === "image/png" ? "png" : mediaType === "image/webp" ? "webp" : "jpg";

const typeForExtension = (extension: string): MealMediaType =>
  extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";

/**
 * Development/runtime image store used before private Appwrite Storage is
 * configured. Files are owner-partitioned on the backend machine and are never
 * embedded in the Android/Wear APK. The opaque object id contains no user id.
 */
export class LocalMealImageStore {
  private readonly rootDirectory: string;

  constructor(rootDirectory = process.env.MOVEFUEL_MEDIA_DIR ?? ".movefuel-runtime/meal-media") {
    this.rootDirectory = path.resolve(rootDirectory);
  }

  async save(userId: string, draftId: string, mediaType: MealMediaType, bytes: Buffer): Promise<StoredMealImage> {
    if (!userId.trim() || !draftId.trim()) throw new Error("invalid_media_owner");
    if (bytes.byteLength < 1 || bytes.byteLength > MEAL_MEDIA_MAX_BYTES) throw new Error("invalid_media_size");
    const ownerHash = createHash("sha256").update(userId).digest("hex").slice(0, 24);
    const draftHash = createHash("sha256").update(draftId).digest("hex").slice(0, 20);
    const extension = extensionFor(mediaType);
    const fileName = `${draftHash}-${randomUUID()}.${extension}`;
    const ownerDirectory = path.join(this.rootDirectory, ownerHash);
    await mkdir(ownerDirectory, { recursive: true });
    await writeFile(path.join(ownerDirectory, fileName), bytes, { mode: 0o600 });
    return {
      objectId: `local-meal-image:${ownerHash}:${fileName}`,
      mediaType,
      sizeBytes: bytes.byteLength,
    };
  }

  async read(objectId: string): Promise<{ bytes: Buffer; mediaType: MealMediaType }> {
    const resolved = this.resolveObjectPath(objectId);
    const extension = resolved.split(".").pop()?.toLowerCase() ?? "jpg";
    return { bytes: await readFile(resolved), mediaType: typeForExtension(extension) };
  }

  async readForUser(userId: string, _accessToken: string | undefined, objectId: string): Promise<{ bytes: Buffer; mediaType: MealMediaType }> {
    const expectedOwnerHash = createHash("sha256").update(userId).digest("hex").slice(0, 24);
    const match = /^local-meal-image:([a-f0-9]{24}):/.exec(objectId);
    if (!match || match[1] !== expectedOwnerHash) throw new Error("meal_image_not_owned");
    return this.read(objectId);
  }

  async delete(objectId: string): Promise<void> {
    const resolved = this.resolveObjectPath(objectId);
    await unlink(resolved).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }

  private resolveObjectPath(objectId: string): string {
    const match = /^local-meal-image:([a-f0-9]{24}):([a-zA-Z0-9.-]+)$/.exec(objectId);
    if (!match) throw new Error("meal_image_not_local");
    const ownerHash = match[1]!;
    const fileName = match[2]!;
    const resolved = path.resolve(this.rootDirectory, ownerHash, fileName);
    if (!resolved.startsWith(this.rootDirectory + path.sep)) throw new Error("meal_image_path_rejected");
    return resolved;
  }
}
