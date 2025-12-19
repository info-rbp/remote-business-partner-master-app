import { getStorage } from 'firebase-admin/storage';
import { getFirestore, getFirebaseAdminApp } from './firebase-admin';

export interface SignedUrlOptions {
  storagePath: string;
  expiresInSeconds?: number;
  bucketName?: string;
}

export async function getFileRecord(orgId: string, fileId: string) {
  const snapshot = await getFirestore().doc(`orgs/${orgId}/files/${fileId}`).get();
  return snapshot.exists ? snapshot.data() : null;
}

export async function createSignedDownloadUrl({ storagePath, expiresInSeconds = 3600, bucketName }: SignedUrlOptions) {
  const app = getFirebaseAdminApp();
  const storage = getStorage(app);
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();

  const [url] = await bucket.file(storagePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInSeconds * 1000,
  });

  return url;
}
