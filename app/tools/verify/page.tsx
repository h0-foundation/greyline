import { PageHeader } from "@/components/page-header";
import { VerifyPlaybook } from "@/components/tools/verify-playbook";

export default function VerifyPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Verify & protect sources"
        description="Field-tested playbooks: run SIFT and lateral reading on a claim before you trust it, verify an image or video's place and time, and move sensitive information without exposing a source. Educational and offline."
      />
      <VerifyPlaybook />
    </div>
  );
}
