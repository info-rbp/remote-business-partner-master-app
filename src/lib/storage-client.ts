'use client';

import { getDownloadURL, getStorage, ref, uploadBytes, type UploadMetadata } from 'firebase/storage';
import { doc, setDoc, Timestamp, type DocumentReference } from 'firebase/firestore';
import { getDb, getFirebaseApp, getFirebaseAuth } from './firebase-client';
import { buildStoragePath, type VaultEntityType } from './storage-paths';

export type VaultVisibility = 'internal' | 'client';

export interface UploadParams {
  orgId: string;
  entityType: VaultEntityType;
  entityId: string;
  file: File;
  category?: string;
  visibility?: VaultVisibility;
  clientId?: string;
  allowedRoles?: Array<'admin' | 'staff' | 'client'>;
}

export interface UploadResult {
  fileId: string;
  storagePath: string;
  downloadUrl: string;
  recordRef: DocumentReference;
}

function createUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
  }

  throw new Error('crypto.randomUUID is not available in this environment.');
}

async function computeSha256(file: File) {
  if (typeof crypto === 'undefined' || !crypto.subtle || !file.stream) {
    return null;
  }

  try {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.warn('Unable to compute SHA-256 for upload', error);
    return null;
  }
}

export async function uploadFileToVault({
  orgId,
  entityType,
  entityId,
  category,
  file,
  visibility = 'internal',
  clientId,
  allowedRoles,
}: UploadParams): Promise<UploadResult> {
  if (typeof window === 'undefined') {
    throw new Error('uploadFileToVault must be called from a client environment.');
  }

  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to upload files.');
  }

  const fileId = createUuid();
  const { storagePath, category: resolvedCategory, clientId: resolvedClientId } = buildStoragePath({
    orgId,
    entityType,
    entityId,
    category,
    clientId,
    fileId,
    originalFilename: file.name,
  });

  const storage = getStorage(getFirebaseApp());
  const storageRef = ref(storage, storagePath);

  const metadata: UploadMetadata = {
    contentType: file.type || 'application/octet-stream',
    customMetadata: {
      orgId,
      entityType,
      entityId,
      fileId,
      ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
    },
  };

  const [uploadResult, sha256] = await Promise.all([
    uploadBytes(storageRef, file, metadata),
    computeSha256(file),
  ]);

  const db = getDb();
  const docRef = doc(db, 'orgs', orgId, 'files', fileId);
  const record = {
    orgId,
    fileId,
    storagePath,
    bucket: uploadResult.metadata.bucket ?? storage.app.options.storageBucket ?? '',
    originalFilename: file.name,
    contentType: uploadResult.metadata.contentType ?? metadata.contentType,
    size: file.size,
    sha256,
    createdAt: Timestamp.now(),
    createdBy: currentUser.uid,
    entityType,
    entityId,
    category: resolvedCategory,
    visibility,
    allowedRoles: allowedRoles ?? (visibility === 'client' ? ['admin', 'staff', 'client'] : ['admin', 'staff']),
    clientId: resolvedClientId ?? null,
    status: 'active',
  };

  await setDoc(docRef, record);
  const downloadUrl = await getDownloadURL(storageRef);

  return {
    fileId,
    storagePath,
    downloadUrl,
    recordRef: docRef,
  };
}
