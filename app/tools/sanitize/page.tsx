import { PageHeader } from "@/components/page-header";
import { Sanitizer } from "@/components/tools/sanitizer";

export const metadata = { title: "Sanitize & redact · Greyline" };

export default function SanitizePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Sanitize & redact"
        description="Strip every trace of metadata from an image by re-encoding it from pixels, and burn redactions directly into those pixels. Entirely in your browser — the file is never uploaded."
        meta={[{ label: "Mode", value: "On-device" }]}
      />
      <Sanitizer />
    </div>
  );
}
