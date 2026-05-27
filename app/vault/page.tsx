import { Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function VaultPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Vault"
        description="Encrypted, offline document storage."
      />
      <EmptyState
        icon={Lock}
        title="The vault is being rebuilt"
        description="AES-256-GCM document storage, unlocked with your passphrase, returns in a later phase."
      />
    </div>
  );
}
