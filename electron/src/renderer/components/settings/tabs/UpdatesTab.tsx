import { Icons } from "../../Icons";
import { Card, SectionHeader } from "../ui";
import { UpdateSection } from "../UpdateSection";

export function UpdatesTab() {
  return (
    <Card className="p-6">
      <SectionHeader
        icon={<Icons.Download className="w-5 h-5" />}
        title="Application Updates"
        description="Keep your app up to date"
      />
      <UpdateSection />
    </Card>
  );
}

export default UpdatesTab;
