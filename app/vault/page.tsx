import { PageHeader } from "@/components/page-header";
import { VaultClient } from "@/components/vault/vault-client";
import { isVaultInitialized, listDocs } from "$server/services/vault";

export const dynamic = "force-dynamic";

export type VaultDoc = {
  id: string;
  name: string;
  category: string;
  filename: string;
  mime_type: string;
  file_size: number;
  tags: string;
  notes: string | null;
  created_at: string;
};

export default function VaultPage() {
  const initialized = isVaultInitialized();
  const docs = listDocs() as VaultDoc[];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vault"
        description="AES-256-GCM encrypted document storage, unlocked with your passphrase. Encrypted on this machine — the passphrase is never stored and nothing is uploaded anywhere."
      />
      <VaultClient initialized={initialized} initialDocs={docs} />
    </div>
  );
}
