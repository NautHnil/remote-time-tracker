import { Icons } from "../../Icons";
import { Card, SectionHeader } from "../ui";
import { UpdateSection, UpdateStep } from "../UpdateSection";

interface UpdatesTabProps {
  version: string;
  step: UpdateStep;
  availableVersion: string | null;
  progress: number;
  errorMessage: string;
  onCheck: () => void | Promise<void>;
  onDownload: () => void | Promise<void>;
  onInstall: () => void | Promise<void>;
}

export function UpdatesTab(props: UpdatesTabProps) {
  return (
    <Card className="p-6">
      <SectionHeader
        icon={<Icons.Download className="w-5 h-5" />}
        title="Application Updates"
        description="Keep your app up to date"
      />
      <UpdateSection {...props} />
    </Card>
  );
}

export default UpdatesTab;
