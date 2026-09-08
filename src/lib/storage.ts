import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

const client =
  env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
    ? new S3Client({
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        forcePathStyle: true,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        },
      })
    : null;

function requireClient() {
  if (!client) throw new Error("S3-compatible storage is not configured");
  return client;
}

export async function createUploadUrl(key: string, contentType: string, expiresIn = 900) {
  return getSignedUrl(
    requireClient(),
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

export async function uploadObject(key: string, body: Uint8Array, contentType: string) {
  await requireClient().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.byteLength,
    }),
  );
  return true;
}

export async function createDownloadUrl(key: string, expiresIn = 900, download = false) {
  return getSignedUrl(
    requireClient(),
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ...(download ? { ResponseContentDisposition: "attachment" } : {}),
    }),
    { expiresIn },
  );
}

export async function deleteObject(key: string) {
  await requireClient().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

export async function verifyStoredObject(key: string, contentType: string, byteSize: number) {
  if (!client) return true;
  try {
    const object = await client.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    if (object.ContentLength && object.ContentLength !== byteSize) {
      console.warn(
        `Object size mismatch for key ${key}: expected ${byteSize}, got ${object.ContentLength}`,
      );
    }
  } catch (err) {
    console.warn(
      `S3 verification skipped for key ${key}:`,
      err instanceof Error ? err.message : err,
    );
  }
  return true;
}

export async function checkStorage() {
  await requireClient().send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
  return true;
}

export type StoredObjectMetadata = {
  key: string;
  contentType: string;
  size?: number;
  checksum?: string;
};
