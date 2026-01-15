/**
 * Sidebar Types
 * Shared types for sidebar components
 */

export type View =
  | "tracker"
  | "tasks"
  | "screenshots"
  | "stats"
  | "organizations"
  | "workspaces"
  | "settings";

export interface NavItem {
  id: View;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}
