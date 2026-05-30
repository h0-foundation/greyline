import { PageHeader } from "@/components/page-header";
import { ImageHashTool } from "@/components/tools/image-hash";

export default function ImageHashPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Image fingerprint"
        description="Perceptual-hash an image (aHash + dHash) to detect near-duplicates — recycled, cropped, or recompressed photos. Compare two images for a similarity distance. Runs entirely in your browser; images never leave your machine."
      />
      <ImageHashTool />
    </div>
  );
}
