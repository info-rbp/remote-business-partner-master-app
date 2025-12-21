export type VaultEntityType = 'client' | 'proposal' | 'project' | 'template';

export interface StoragePathOptions {
  orgId: string;
  entityType: VaultEntityType;
  entityId: string;
  category?: string;
  clientId?: string;
  fileId: string;
  originalFilename: string;
  now?: Date;
}

export const CLIENT_VAULT_CATEGORIES = [
  'contracts',
  'sows',
  'evidence',
  'reports',
  'communications',
  'misc',
] as const;

export const PROJECT_VAULT_CATEGORIES = [
  'deliverables',
  'client_uploads',
  'reference',
] as const;

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

export function sanitizeFilename(filename: string) {
  const baseName = filename.split('/').pop()?.split('\\').pop() ?? 'file';
  const trimmed = baseName.trim();
  const safe = trimmed
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');

  return safe.length > 0 ? safe : 'file';
}

export function buildStoragePath({
  orgId,
  entityType,
  entityId,
  category,
  clientId,
  fileId,
  originalFilename,
  now = new Date(),
}: StoragePathOptions) {
  const safeFilename = sanitizeFilename(originalFilename);
  const year = now.getUTCFullYear().toString();
  const month = pad(now.getUTCMonth() + 1);

  if (!orgId || !entityId) {
    throw new Error('orgId and entityId are required to build a storage path.');
  }

  switch (entityType) {
    case 'client': {
      const vaultCategory = category ?? 'misc';
      if (!CLIENT_VAULT_CATEGORIES.includes(vaultCategory as (typeof CLIENT_VAULT_CATEGORIES)[number])) {
        throw new Error(`Invalid client vault category: ${vaultCategory}.`);
      }
      const resolvedClientId = clientId ?? entityId;
      return {
        storagePath: `orgs/${orgId}/clients/${resolvedClientId}/vault/${vaultCategory}/${year}/${month}/${fileId}_${safeFilename}`,
        category: vaultCategory,
        clientId: resolvedClientId,
      };
    }
    case 'proposal':
      return {
        storagePath: `orgs/${orgId}/proposals/${entityId}/attachments/${year}/${month}/${fileId}_${safeFilename}`,
        category: 'attachments',
        clientId,
      };
    case 'project':
      {
        const projectCategory = category ?? 'deliverables';
        if (!PROJECT_VAULT_CATEGORIES.includes(projectCategory as (typeof PROJECT_VAULT_CATEGORIES)[number])) {
          throw new Error(`Invalid project vault category: ${projectCategory}.`);
        }
        return {
          storagePath: `orgs/${orgId}/projects/${entityId}/${projectCategory}/${year}/${month}/${fileId}_${safeFilename}`,
          category: projectCategory,
          clientId,
        };
      }
    case 'template': {
      const templateType = category ?? entityId;
      return {
        storagePath: `orgs/${orgId}/templates/${templateType}/${year}/${month}/${fileId}_${safeFilename}`,
        category: templateType,
        clientId,
      };
    }
    default: {
      const exhaustiveCheck: never = entityType;
      throw new Error(`Unsupported entity type: ${exhaustiveCheck}.`);
    }
  }
}
