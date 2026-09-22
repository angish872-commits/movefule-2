import { createHash, randomUUID } from "node:crypto";
import type { MealImageStore, StoredMealImage } from "./local-image-store.ts";
import { MEAL_MEDIA_MAX_BYTES, type MealMediaType } from "./media.ts";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type AppwriteMealImageStoreOptions = {
  endpoint: string;
  projectId: string;
  apiKey: string;
  bucketId: string;
  databaseId?: string;
  fetcher?: FetchLike;
};

const sanitizeEndpoint = (value: string): string => value.replace(/\/+$/, "");
const appwriteObjectId = (bucketId: string, fileId: string): string => `appwrite-meal-image:${bucketId}:${fileId}`;
const TEMPORARY_MEDIA_TTL_MS = 24 * 60 * 60 * 1_000;

function parseObjectId(objectId: string): { bucketId: string; fileId: string } {
  const match = /^appwrite-meal-image:([A-Za-z0-9._-]{1,36}):([A-Za-z0-9._-]{1,36})$/.exec(objectId);
  if (!match) throw new Error("meal_image_not_appwrite");
  return { bucketId: match[1]!, fileId: match[2]! };
}

function extensionFor(mediaType: MealMediaType): string {
  return mediaType === "image/png" ? "png" : mediaType === "image/webp" ? "webp" : "jpg";
}

/**
 * Server-only private Appwrite Storage adapter.
 *
 * The API key never crosses into Android/Wear. Every file receives explicit
 * owner-only permissions even though the server credential performs the
 * transport. The object id stores only opaque bucket/file identifiers.
 */
export class AppwriteMealImageStore implements MealImageStore {
  private readonly endpoint: string;
  private readonly projectId: string;
  private readonly apiKey: string;
  private readonly bucketId: string;
  private readonly fetcher: FetchLike;
  private readonly databaseId?: string;

  constructor(options: AppwriteMealImageStoreOptions) {
    if (!options.endpoint.trim() || !options.projectId.trim() || !options.apiKey.trim() || !options.bucketId.trim()) {
      throw new Error("appwrite_meal_image_store_not_configured");
    }
    this.endpoint = sanitizeEndpoint(options.endpoint);
    this.projectId = options.projectId.trim();
    this.apiKey = options.apiKey.trim();
    this.bucketId = options.bucketId.trim();
    this.databaseId = options.databaseId?.trim() || undefined;
    this.fetcher = options.fetcher ?? fetch;
  }

  async save(userId: string, draftId: string, mediaType: MealMediaType, bytes: Buffer): Promise<StoredMealImage> {
    if (!userId.trim() || !draftId.trim()) throw new Error("invalid_media_owner");
    if (bytes.byteLength < 1 || bytes.byteLength > MEAL_MEDIA_MAX_BYTES) throw new Error("invalid_media_size");

    const fileId = randomUUID();
    const form = new FormData();
    form.append("fileId", fileId);
    form.append("file", new Blob([bytes], { type: mediaType }), `meal.${extensionFor(mediaType)}`);
    for (const permission of [
      `read(\"user:${userId}\")`,
      `update(\"user:${userId}\")`,
      `delete(\"user:${userId}\")`,
    ]) {
      form.append("permissions[]", permission);
    }

    const response = await this.fetcher(
      `${this.endpoint}/storage/buckets/${encodeURIComponent(this.bucketId)}/files`,
      {
        method: "POST",
        headers: this.headers(),
        body: form,
      },
    );
    if (!response.ok) throw new Error(`appwrite_meal_image_upload_${response.status}`);
    const body = await response.json() as Record<string, unknown>;
    const persistedFileId = typeof body.$id === "string" ? body.$id : fileId;
    if (this.databaseId) {
      const checksum = createHash("sha256").update(bytes).digest("hex");
      const mediaId = randomUUID();
      const createdAt = new Date().toISOString();
      const deleteAfter = new Date(Date.parse(createdAt) + TEMPORARY_MEDIA_TTL_MS).toISOString();
      const metadataResponse = await this.fetcher(
        `${this.endpoint}/tablesdb/${encodeURIComponent(this.databaseId)}/tables/meal_media/rows`,
        {
          method: "POST",
          headers: { ...this.headers(), "content-type": "application/json" },
          body: JSON.stringify({
            rowId: mediaId,
            data: {
              mediaId, userId, draftId, bucketId: this.bucketId, objectId: persistedFileId,
              variant: "original", checksum, state: "temporary", deleteAfter, createdAt, deletedAt: null,
            },
            permissions: [
              `read("user:${userId}")`, `write("user:${userId}")`,
              `update("user:${userId}")`, `delete("user:${userId}")`,
            ],
          }),
        },
      );
      if (!metadataResponse.ok) {
        await this.fetcher(
          `${this.endpoint}/storage/buckets/${encodeURIComponent(this.bucketId)}/files/${encodeURIComponent(persistedFileId)}`,
          { method: "DELETE", headers: this.headers() },
        ).catch(() => undefined);
        throw new Error(`appwrite_meal_image_metadata_${metadataResponse.status}`);
      }
    }
    return {
      objectId: appwriteObjectId(this.bucketId, persistedFileId),
      mediaType,
      sizeBytes: bytes.byteLength,
    };
  }

  async read(objectId: string): Promise<{ bytes: Buffer; mediaType: MealMediaType }> {
    const { bucketId, fileId } = parseObjectId(objectId);
    if (bucketId !== this.bucketId) throw new Error("meal_image_bucket_rejected");
    const response = await this.fetcher(
      `${this.endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/view`,
      { method: "GET", headers: this.headers() },
    );
    if (!response.ok) throw new Error(`appwrite_meal_image_read_${response.status}`);
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
    const mediaType: MealMediaType = contentType === "image/png" || contentType === "image/webp" ? contentType : "image/jpeg";
    return { bytes: Buffer.from(await response.arrayBuffer()), mediaType };
  }

  async readForUser(userId: string, accessToken: string | undefined, objectId: string): Promise<{ bytes: Buffer; mediaType: MealMediaType }> {
    if (!userId.trim() || !accessToken?.trim()) throw new Error("meal_image_owner_session_required");
    const { bucketId, fileId } = parseObjectId(objectId);
    if (bucketId !== this.bucketId) throw new Error("meal_image_bucket_rejected");
    // Deliberately use the signed-in user's Appwrite JWT here rather than the
    // server key. Appwrite's file-level read permission is therefore the final
    // authorization check for restored meal photos.
    const response = await this.fetcher(
      `${this.endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}/view`,
      {
        method: "GET",
        headers: {
          "X-Appwrite-Project": this.projectId,
          "X-Appwrite-JWT": accessToken,
          "X-Appwrite-Response-Format": "1.9.5",
        },
      },
    );
    if (response.status === 401 || response.status === 403 || response.status === 404) throw new Error("meal_image_not_owned");
    if (!response.ok) throw new Error(`appwrite_meal_image_read_${response.status}`);
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
    const mediaType: MealMediaType = contentType === "image/png" || contentType === "image/webp" ? contentType : "image/jpeg";
    return { bytes: Buffer.from(await response.arrayBuffer()), mediaType };
  }

  async delete(objectId: string): Promise<void> {
    const { bucketId, fileId } = parseObjectId(objectId);
    if (bucketId !== this.bucketId) throw new Error("meal_image_bucket_rejected");
    const response = await this.fetcher(
      `${this.endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files/${encodeURIComponent(fileId)}`,
      { method: "DELETE", headers: this.headers() },
    );
    if (!response.ok && response.status !== 404) throw new Error(`appwrite_meal_image_delete_${response.status}`);
  }

  private headers(): Record<string, string> {
    return {
      "X-Appwrite-Project": this.projectId,
      "X-Appwrite-Key": this.apiKey,
      "X-Appwrite-Response-Format": "1.9.5",
    };
  }
}
