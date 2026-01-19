/**
 * Admin Types
 * Type definitions for admin panel
 */

// ============================================================================
// PAGINATION
// ============================================================================

export interface AdminPagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: AdminPagination;
}

// ============================================================================
// USERS
// ============================================================================

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  system_role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  orgs_count?: number;
  workspaces_count?: number;
  tasks_count?: number;
  timelogs_count?: number;
  total_duration?: number;
}

export interface AdminUserDetail extends AdminUser {
  organizations: AdminOrgMembership[];
  workspaces: AdminWorkspaceMembership[];
  recent_tasks: AdminTask[];
  recent_timelogs: AdminTimeLog[];
  devices: AdminDevice[];
}

export interface AdminOrgMembership {
  org_id: number;
  org_name: string;
  org_slug: string;
  role: string;
  joined_at: string;
  is_active: boolean;
}

export interface AdminWorkspaceMembership {
  workspace_id: number;
  workspace_name: string;
  org_id: number;
  org_name: string;
  role_name: string;
  is_admin: boolean;
  joined_at: string;
  is_active: boolean;
}

export interface AdminDevice {
  id: number;
  device_uuid: string;
  device_name: string;
  device_type: string;
  os: string;
  os_version: string;
  app_version: string;
  ip_address: string;
  last_seen_at: string | null;
  is_active: boolean;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  pagination: AdminPagination;
}

export interface AdminCreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: string;
  system_role?: string;
}

export interface AdminUpdateUserRequest {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  system_role?: string;
  is_active?: boolean;
}

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export interface AdminOrganization {
  id: number;
  name: string;
  slug: string;
  description: string;
  owner_id: number;
  owner_email: string;
  owner_name: string;
  member_count: number;
  workspace_count: number;
  is_active: boolean;
  is_verified: boolean;
  verified_at: string | null;
  admin_notes: string;
  allow_invite_link: boolean;
  max_members: number;
  created_at: string;
  updated_at: string;
}

export interface AdminOrgDetail extends AdminOrganization {
  members: AdminOrgMember[];
  workspaces: AdminWorkspaceSummary[];
}

export interface AdminOrgMember {
  user_id: number;
  user_email: string;
  user_name: string;
  role: string;
  joined_at: string;
  is_active: boolean;
}

export interface AdminWorkspaceSummary {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminOrgListResponse {
  organizations: AdminOrganization[];
  pagination: AdminPagination;
}

export interface AdminUpdateOrgRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  admin_notes?: string;
  allow_invite_link?: boolean;
  max_members?: number;
}

// ============================================================================
// WORKSPACES
// ============================================================================

export interface AdminWorkspace {
  id: number;
  name: string;
  slug: string;
  description: string;
  organization_id: number;
  org_name: string;
  admin_id: number;
  admin_email: string;
  admin_name: string;
  member_count: number;
  task_count: number;
  is_active: boolean;
  is_archived: boolean;
  archived_at: string | null;
  is_billable: boolean;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
}

export interface AdminWorkspaceDetail extends AdminWorkspace {
  members: AdminWorkspaceMember[];
  recent_tasks: AdminTask[];
}

export interface AdminWorkspaceMember {
  user_id: number;
  user_email: string;
  user_name: string;
  role_name: string;
  is_admin: boolean;
  joined_at: string;
  is_active: boolean;
}

export interface AdminWorkspaceListResponse {
  workspaces: AdminWorkspace[];
  pagination: AdminPagination;
}

export interface AdminUpdateWorkspaceRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  is_billable?: boolean;
  hourly_rate?: number;
}

// ============================================================================
// TASKS
// ============================================================================

export interface AdminTask {
  id: number;
  title: string;
  description: string;
  user_id: number;
  user_email: string;
  user_name: string;
  organization_id: number | null;
  org_name: string;
  workspace_id: number | null;
  workspace_name: string;
  status: string;
  priority: number;
  color: string;
  is_manual: boolean;
  admin_notes: string;
  start_time: string | null;
  end_time: string | null;
  total_time: number;
  timelogs_count: number;
  total_duration: number;
  screenshot_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminTaskDetail extends AdminTask {
  timelogs: AdminTimeLog[];
  screenshots: AdminScreenshot[];
}

export interface AdminTaskListResponse {
  tasks: AdminTask[];
  pagination: AdminPagination;
}

export interface AdminUpdateTaskRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: number;
  admin_notes?: string;
}

// ============================================================================
// TIME LOGS
// ============================================================================

export interface AdminTimeLog {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  task_id: number | null;
  task_title: string;
  organization_id: number | null;
  org_name: string;
  workspace_id: number | null;
  workspace_name: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  status: string;
  is_manual: boolean;
  is_approved: boolean;
  approved_by: number | null;
  approved_at: string | null;
  admin_notes: string;
  screenshot_count: number;
  created_at: string;
}

export interface AdminTimeLogDetail extends AdminTimeLog {
  screenshots: AdminScreenshot[];
}

export interface AdminTimeLogListResponse {
  timelogs: AdminTimeLog[];
  pagination: AdminPagination;
}

export interface AdminUpdateTimeLogRequest {
  task_title?: string;
  notes?: string;
  admin_notes?: string;
  status?: string;
  is_approved?: boolean;
}

export interface AdminApproveTimeLogsRequest {
  ids: number[];
  approved: boolean;
}

// ============================================================================
// SCREENSHOTS
// ============================================================================

export interface AdminScreenshot {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  timelog_id: number | null;
  task_id: number | null;
  task_title: string;
  organization_id: number | null;
  org_name: string;
  workspace_id: number | null;
  workspace_name: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  thumbnail_path: string;
  monitor_index: number;
  captured_at: string;
  screen_number: number;
  is_encrypted: boolean;
  created_at: string;
}

export interface AdminScreenshotListResponse {
  screenshots: AdminScreenshot[];
  pagination: AdminPagination;
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface AdminOverviewStats {
  total_users: number;
  active_users: number;
  new_users_this_week: number;
  total_organizations: number;
  verified_organizations: number;
  total_workspaces: number;
  active_workspaces: number;
  total_tasks: number;
  active_tasks: number;
  total_timelogs: number;
  total_duration: number;
  week_duration: number;
  total_screenshots: number;
  total_storage: number;
  total_storage_human: string;
  // Growth percentages
  users_growth?: number;
  orgs_growth?: number;
  workspaces_growth?: number;
  tasks_growth?: number;
  timelogs_growth?: number;
  screenshots_growth?: number;
  total_tracked_hours?: number;
}

export interface AdminTrendStats {
  user_growth: AdminDailyStat[];
  activity_trend: AdminDailyStat[];
}

export interface AdminDailyStat {
  date: string;
  total_users?: number;
  new_users?: number;
  duration?: number;
  timelogs?: number;
  screenshots?: number;
}

export interface AdminUserPerformance {
  user_id: number;
  user_name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  total_duration: number;
  total_hours?: number;
  task_count: number;
  total_tasks?: number;
  rank: number;
}

export interface AdminOrgStats {
  size_distribution: AdminOrgSizeCategory[];
  top_workspaces: AdminTopWorkspace[];
}

export interface AdminOrgSizeCategory {
  category: string;
  count: number;
}

export interface AdminTopWorkspace {
  workspace_id: number;
  name: string;
  organization_name: string;
  total_duration: number;
  member_count: number;
}

export interface AdminActivityStats {
  today_duration: number;
  today_active_users: number;
  today_screenshots: number;
  activity_by_hour: AdminHourlyStat[];
  peak_hour: number;
  peak_hour_count: number;
}

export interface AdminHourlyStat {
  hour: number;
  count: number;
}

// ============================================================================
// FILTER PARAMS
// ============================================================================

export interface AdminUserFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: string;
  system_role?: string;
  is_active?: boolean;
  org_id?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface AdminOrgFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  is_verified?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface AdminWorkspaceFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  org_id?: number;
  is_active?: boolean;
  is_archived?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface AdminTaskFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  user_id?: number;
  org_id?: number;
  workspace_id?: number;
  status?: string;
  is_manual?: boolean;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface AdminTimeLogFilterParams {
  page?: number;
  page_size?: number;
  user_id?: number;
  org_id?: number;
  workspace_id?: number;
  task_id?: number;
  status?: string;
  is_approved?: boolean;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface AdminScreenshotFilterParams {
  page?: number;
  page_size?: number;
  user_id?: number;
  org_id?: number;
  workspace_id?: number;
  task_id?: number;
  timelog_id?: number;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface AdminTrendFilterParams {
  period?: "day" | "week" | "month";
  start_date?: string;
  end_date?: string;
}
