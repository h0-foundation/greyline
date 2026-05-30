import { PageHeader } from "@/components/page-header";
import { EntityExtractor } from "@/components/tools/entity-extractor";

export const metadata = { title: "Entity extractor · Greyline" };

export default function EntitiesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Entity extractor"
        description="Pull people, organisations, emails, phone numbers, IBANs, crypto addresses, handles, URLs and IPs out of pasted text — all on-device. Feeds the self-doxxing audit."
        meta={[{ label: "Mode", value: "On-device" }]}
      />
      <EntityExtractor />
    </div>
  );
}
