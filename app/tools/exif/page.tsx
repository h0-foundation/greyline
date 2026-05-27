import { PageHeader } from "@/components/page-header";
import { ExifStripper } from "@/components/tools/exif-stripper";

export default function ExifPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="EXIF stripper"
        description="Remove GPS coordinates, device fingerprints, and timestamps from a photo. Processed locally — your photo never leaves this machine."
      />
      <ExifStripper />
    </div>
  );
}
