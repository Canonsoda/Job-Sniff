/**
 * Delete stored resume files that no longer have a database record.
 *
 * Orphans accumulate from failed uploads and from records removed before file
 * cleanup existed. The app now deletes files alongside their records, so this
 * is a repair/maintenance tool rather than something to run on a schedule.
 *
 *   npm run sweep-orphans          # dry run, lists what would go
 *   npm run sweep-orphans -- --apply
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Resume from '../models/resume.model.js';
import { listStored, deleteStored, sizeOf, STORAGE_DRIVER } from '../config/storage.js';

dotenv.config();

const apply = process.argv.includes('--apply');
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

await mongoose.connect(process.env.MONGO_URI);

const resumes = await Resume.find({}).select('storedFileName');
const referenced = new Set(resumes.map((r) => r.storedFileName).filter(Boolean));
const stored = await listStored();
const orphans = stored.filter((key) => !referenced.has(key));

let orphanBytes = 0;
for (const key of orphans) orphanBytes += await sizeOf(key);

console.log(`driver              : ${STORAGE_DRIVER}`);
console.log(`resume records      : ${resumes.length}`);
console.log(`files in storage    : ${stored.length}`);
console.log(`referenced by record: ${referenced.size}`);
console.log(`orphaned            : ${orphans.length} (${mb(orphanBytes)})\n`);

// A record pointing at a file that no longer exists is the opposite problem:
// the row survives but the download 404s. Report it, never delete it.
const missing = [...referenced].filter((key) => !stored.includes(key));
if (missing.length) {
  console.log(`WARNING: ${missing.length} record(s) reference a file that is gone:`);
  missing.forEach((k) => console.log(`   ${k}`));
  console.log('');
}

if (orphans.length === 0) {
  console.log('Nothing to sweep.');
} else if (!apply) {
  orphans.forEach((k) => console.log(`   would delete  ${k}`));
  console.log(`\nDry run. Re-run with --apply to delete these ${orphans.length} files.`);
} else {
  const removed = await deleteStored(orphans);
  console.log(`Deleted ${removed} orphaned file(s), reclaimed ${mb(orphanBytes)}.`);
}

await mongoose.disconnect();
