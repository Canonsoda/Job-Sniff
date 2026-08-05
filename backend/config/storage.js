/**
 * Resume file storage.
 *
 * Two drivers behind one interface:
 *
 *   local  (default) - keeps files on the server's disk. Fine for development.
 *   s3               - any S3-compatible bucket (AWS S3, Cloudflare R2,
 *                      Backblaze B2, DigitalOcean Spaces, MinIO).
 *
 * Use s3 in production. Hosts like Render/Heroku give each deploy a fresh
 * container, so anything written to local disk disappears on the next deploy
 * and every download 404s while the database still lists the resume.
 *
 * Set S3_BUCKET (plus credentials) and the s3 driver activates automatically;
 * STORAGE_DRIVER can force either one.
 *
 *   STORAGE_DRIVER=s3
 *   S3_BUCKET=jobsniff-resumes
 *   S3_REGION=auto
 *   S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com   # omit for AWS S3
 *   S3_ACCESS_KEY_ID=...
 *   S3_SECRET_ACCESS_KEY=...
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const S3_BUCKET = process.env.S3_BUCKET;
export const STORAGE_DRIVER =
  process.env.STORAGE_DRIVER || (S3_BUCKET ? "s3" : "local");

const S3_PREFIX = process.env.S3_PREFIX || "resumes";

let s3ClientPromise = null;

// Imported only when the s3 driver is actually in use, so local installs
// never pay for loading the AWS SDK.
const getS3 = async () => {
  if (!s3ClientPromise) {
    s3ClientPromise = (async () => {
      const { S3Client } = await import("@aws-sdk/client-s3");
      return new S3Client({
        region: process.env.S3_REGION || "us-east-1",
        ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}),
        ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
              },
            }
          : {}),
      });
    })();
  }
  return s3ClientPromise;
};

// Keys are stored in the DB, so never let one escape the uploads directory.
const localPathFor = (key) => path.join(UPLOAD_DIR, path.basename(key));

/**
 * Move a freshly uploaded multer file into permanent storage.
 * Returns the storage key to persist on the resume record.
 */
export const persistUpload = async (file) => {
  if (STORAGE_DRIVER === "local") {
    return file.filename; // multer already wrote it to UPLOAD_DIR
  }

  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3();
  const key = `${S3_PREFIX}/${file.filename}`;

  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: fs.createReadStream(file.path),
      ContentType: file.mimetype || "application/pdf",
    })
  );

  // The local copy was only needed to stream to the parser
  await fs.promises.unlink(file.path).catch(() => {});
  return key;
};

/** Open a readable stream for a stored file, or null if it is gone. */
export const openDownload = async (key) => {
  if (!key) return null;

  if (STORAGE_DRIVER === "local") {
    const filePath = localPathFor(key);
    if (path.relative(UPLOAD_DIR, filePath).startsWith("..")) return null;
    if (!fs.existsSync(filePath)) return null;
    return {
      stream: fs.createReadStream(filePath),
      contentLength: fs.statSync(filePath).size,
      contentType: "application/pdf",
    };
  }

  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3();
  try {
    const out = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return {
      stream: out.Body,
      contentLength: out.ContentLength,
      contentType: out.ContentType || "application/pdf",
    };
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NoSuchKey") return null;
    throw err;
  }
};

/** Delete stored files. Never throws - a failed delete must not fail the request. */
export const deleteStored = async (keys) => {
  const list = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
  if (list.length === 0) return 0;

  let removed = 0;

  if (STORAGE_DRIVER === "local") {
    for (const key of list) {
      try {
        const filePath = localPathFor(key);
        if (path.relative(UPLOAD_DIR, filePath).startsWith("..")) continue;
        await fs.promises.unlink(filePath);
        removed++;
      } catch (err) {
        if (err.code !== "ENOENT") console.error(`Failed to delete ${key}:`, err.message);
      }
    }
    return removed;
  }

  const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3();

  // DeleteObjects accepts at most 1000 keys per call
  for (let i = 0; i < list.length; i += 1000) {
    const batch = list.slice(i, i + 1000);
    try {
      const out = await client.send(
        new DeleteObjectsCommand({
          Bucket: S3_BUCKET,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        })
      );
      removed += batch.length - (out.Errors?.length || 0);
      out.Errors?.forEach((e) => console.error(`Failed to delete ${e.Key}:`, e.Message));
    } catch (err) {
      console.error("Bulk delete failed:", err.message);
    }
  }
  return removed;
};

/** List every stored key. Used by the orphan sweep. */
export const listStored = async () => {
  if (STORAGE_DRIVER === "local") {
    if (!fs.existsSync(UPLOAD_DIR)) return [];
    return fs.readdirSync(UPLOAD_DIR).filter((name) =>
      fs.statSync(path.join(UPLOAD_DIR, name)).isFile()
    );
  }

  const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  const client = await getS3();
  const keys = [];
  let ContinuationToken;

  do {
    const out = await client.send(
      new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: S3_PREFIX, ContinuationToken })
    );
    out.Contents?.forEach((o) => keys.push(o.Key));
    ContinuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (ContinuationToken);

  return keys;
};

/** Byte size of a stored object, or 0 if unknown. */
export const sizeOf = async (key) => {
  if (STORAGE_DRIVER !== "local") return 0;
  try {
    return fs.statSync(localPathFor(key)).size;
  } catch {
    return 0;
  }
};

/** Remove a multer temp file after a failed upload, so it is not orphaned. */
export const discardUpload = async (file) => {
  if (!file?.path) return;
  await fs.promises.unlink(file.path).catch(() => {});
};
