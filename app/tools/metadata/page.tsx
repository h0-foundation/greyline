import { PageHeader } from "@/components/page-header";
import { MetadataStripper } from "@/components/tools/metadata-stripper";

export const metadata = { title: "Metadata stripper · Greyline" };

export default function MetadataPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Metadata stripper"
        description="Scan an image for hidden metadata — EXIF, GPS, XMP, IPTC, text chunks — and download a cleaned copy. JPEG, PNG and WebP are stripped losslessly (byte-level, no recompression), and you see exactly what was removed. Everything runs on-device."
        meta={[{ label: "Mode", value: "On-device · lossless" }]}
      />
      <MetadataStripper />
    </div>
  );
}
