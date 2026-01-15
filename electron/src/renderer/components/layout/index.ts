/**
 * Layout Components Index
 */

export { default as Header } from "./Header";
export { default as MainLayout } from "./MainLayout";
export { default as Sidebar, type View } from "./Sidebar";

// Re-export sidebar sub-components for advanced usage
export {
  MiniTrackerStatus,
  NavSection,
  NoWorkspaceMessage,
  OrgRail,
  SettingsButton,
  SidebarHeader,
  UserProfile,
  WorkspaceSwitcher,
} from "./sidebar-components";
export type { NavItem } from "./sidebar-components";
