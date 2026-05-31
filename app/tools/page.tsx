import { PageHeader } from "@/components/page-header";
import { ToolsCatalog } from "@/components/tools/tools-catalog";

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Tools"
        description="Field, privacy, and verification tools. Anything marked offline runs entirely on this machine; the rest use an optional connection you control in Settings. Tip: press ⌘K to jump straight to any tool."
      />
      <ToolsCatalog />
    </div>
  );
}
