'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where, type DocumentData } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { getDb, getFirebaseApp } from '@/lib/firebase-client';
import { uploadFileToVault, type VaultVisibility } from '@/lib/storage-client';
import { CLIENT_VAULT_CATEGORIES, type VaultEntityType } from '@/lib/storage-paths';

type VaultFileRecord = DocumentData & {
  fileId: string;
  originalFilename: string;
  storagePath: string;
  createdAt?: { seconds: number; nanoseconds: number };
  category?: string | null;
  contentType?: string | null;
  visibility?: VaultVisibility;
};

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? 'demo-org';

interface DocumentVaultProps {
  orgId?: string;
  entityType: VaultEntityType;
  entityId: string;
  clientId?: string;
  title?: string;
  allowUploads?: boolean;
  defaultVisibility?: VaultVisibility;
  defaultCategory?: string;
}

export function DocumentVault({
  orgId,
  entityType,
  entityId,
  clientId,
  title = 'Document Vault',
  allowUploads = true,
  defaultVisibility = 'internal',
  defaultCategory,
}: DocumentVaultProps) {
  const [files, setFiles] = useState<VaultFileRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(defaultCategory ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const resolvedOrgId = orgId ?? DEFAULT_ORG_ID;
  const storage = getStorage(getFirebaseApp());

  useEffect(() => {
    const db = getDb();
    const filesRef = collection(db, 'orgs', resolvedOrgId, 'files');
    const fileQuery = query(
      filesRef,
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(fileQuery, (snapshot) => {
      const nextFiles = snapshot.docs.map((docSnapshot) => ({
        fileId: docSnapshot.id,
        ...(docSnapshot.data() as DocumentData),
      })) as VaultFileRecord[];
      setFiles(nextFiles);
    });

    return () => unsubscribe();
  }, [entityId, entityType, resolvedOrgId]);

  const visibleFiles = useMemo(() => {
    if (!selectedCategory) {
      return files;
    }
    return files.filter((file) => file.category === selectedCategory);
  }, [files, selectedCategory]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await uploadFileToVault({
        orgId: resolvedOrgId,
        entityType,
        entityId,
        clientId,
        category: selectedCategory ?? undefined,
        file: nextFile,
        visibility: defaultVisibility,
      });
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Upload failed';
      setError(message);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (file: VaultFileRecord) => {
    setDownloadingId(file.fileId);
    setError(null);

    try {
      const fileRef = ref(storage, file.storagePath);
      const url = await getDownloadURL(fileRef);
      window.open(url, '_blank', 'noopener');
    } catch (downloadError) {
      const message = downloadError instanceof Error ? downloadError.message : 'Unable to generate download link';
      setError(message);
    } finally {
      setDownloadingId(null);
    }
  };

  const uploadCategoryPicker = entityType === 'client' ? (
    <select
      className="bg-gray-700 text-white p-2 rounded"
      value={selectedCategory ?? ''}
      onChange={(event) => setSelectedCategory(event.target.value || null)}
    >
      <option value="">All categories</option>
      {CLIENT_VAULT_CATEGORIES.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  ) : null;

  return (
    <div className="bg-gray-800 p-4 rounded-lg mt-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-gray-400">
            Org: <span className="text-gray-200">{resolvedOrgId}</span> · Entity: {entityType}/{entityId}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {uploadCategoryPicker}
          {allowUploads && (
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded cursor-pointer text-sm">
              {isUploading ? 'Uploading…' : 'Upload file'}
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
                aria-label="Upload file to vault"
                disabled={isUploading}
              />
            </label>
          )}
        </div>
      </div>

      {error && <div className="text-red-400 mb-3 text-sm">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-300 border-b border-gray-700">
              <th className="p-2">Name</th>
              <th className="p-2">Category</th>
              <th className="p-2">Visibility</th>
              <th className="p-2">Uploaded</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleFiles.length === 0 ? (
              <tr>
                <td className="p-2 text-gray-400" colSpan={5}>
                  No files yet.
                </td>
              </tr>
            ) : (
              visibleFiles.map((file) => (
                <tr key={file.fileId} className="border-b border-gray-700">
                  <td className="p-2">{file.originalFilename}</td>
                  <td className="p-2">{file.category ?? '—'}</td>
                  <td className="p-2 capitalize">{file.visibility ?? 'internal'}</td>
                  <td className="p-2">
                    {file.createdAt
                      ? new Date(file.createdAt.seconds * 1000).toLocaleString()
                      : '—'}
                  </td>
                  <td className="p-2 text-right">
                    <button
                      type="button"
                      className="text-blue-400 hover:underline text-sm"
                      onClick={() => handleDownload(file)}
                      disabled={downloadingId === file.fileId}
                    >
                      {downloadingId === file.fileId ? 'Preparing…' : 'Download'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
