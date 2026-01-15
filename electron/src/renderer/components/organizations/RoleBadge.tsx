/**
 * Role Badge Component
 * Displays a styled badge for organization/workspace roles
 */

import { getRoleBadgeColors } from "./utils";

interface RoleBadgeProps {
  role: string;
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRoleBadgeColors(
        role
      )}`}
    >
      {role}
    </span>
  );
}
