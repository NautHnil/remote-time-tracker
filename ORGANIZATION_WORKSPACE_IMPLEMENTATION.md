# Organization & Workspace Implementation Plan

> **Created:** 2024-12-29  
> **Updated:** 2024-12-29  
> **Status:** ✅ COMPLETED  
> **Related Requirements:** II. Yêu cầu bổ sung 02 & III. Yêu cầu bổ sung 03

---

## 📋 Tổng quan

Xây dựng tính năng quản lý **Organization**, **Workspace (Project)** và hệ thống **phân quyền quản trị** cho ứng dụng Remote Time Tracker.

---

## 🏗️ Kiến trúc Phân quyền

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SYSTEM LEVEL (III)                            │
│  ┌──────────────┐     ┌──────────────┐                              │
│  │ System Admin │     │ System Member│                              │
│  │ (Full access)│     │ (Normal user)│                              │
│  └──────┬───────┘     └──────┬───────┘                              │
│         │                    │                                       │
└─────────┼────────────────────┼───────────────────────────────────────┘
          │                    │
          ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     ORGANIZATION LEVEL (II)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Org Owner   │  │  Org Admin   │  │  Org Member  │               │
│  │ (Tạo org,    │  │ (Manage ws,  │  │ (View only,  │               │
│  │  delete ws)  │  │  invite)     │  │  join ws)    │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                 │                        │
└─────────┼─────────────────┼─────────────────┼────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      WORKSPACE LEVEL (II)                            │
│  ┌──────────────┐  ┌────────────────────────────────────────┐       │
│  │ WS Admin/PM  │  │ WS Members (with custom roles)        │       │
│  │ (Manage ws,  │  │ dev, ba, tester, designer, etc.       │       │
│  │  add members)│  │ (Permissions based on role)           │       │
│  └──────────────┘  └────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Ma trận Phân quyền

| Action | System Admin | Org Owner | Org Admin | WS Admin | Member |
|--------|:------------:|:---------:|:---------:|:--------:|:------:|
| Tạo/Xóa User | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem tất cả Tasks/TimeLogs | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tạo Organization | ✅ | ✅* | ❌ | ❌ | ❌ |
| Xóa Organization | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| Tạo Workspace | ❌ | ✅ | ✅ | ❌ | ❌ |
| Xóa Workspace | ❌ | ✅ | ❌ | ❌ | ❌ |
| Sửa Workspace | ❌ | ✅ | ✅ (assigned) | ✅ | ❌ |
| Add WS Member | ❌ | ✅ | ✅ | ✅ | ❌ |
| Create WS Role | ❌ | ✅ | ✅ | ✅ | ❌ |
| Delete WS Role | ❌ | ✅ | ❌ | ❌ | ❌ |
| Invite to Org | ❌ | ✅ | ✅ | ❌ | ❌ |
| View own Tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete own Tasks | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 📦 PHASE 1: BACKEND CORE (Foundation)

### Mục tiêu
Xây dựng các DTOs, Services, và Controllers cho Organization, Workspace, và Invitation.

### Tasks

| ID | Task | File | Status |
|----|------|------|:------:|
| 1.1 | DTOs cho Organization | `backend/internal/dto/organization_dto.go` | ✅ |
| 1.2 | DTOs cho Workspace | `backend/internal/dto/organization_dto.go` | ✅ |
| 1.3 | DTOs cho Invitation | `backend/internal/dto/organization_dto.go` | ✅ |
| 1.4 | DTOs cho WorkspaceRole | `backend/internal/dto/organization_dto.go` | ✅ |
| 1.5 | Organization Service | `backend/internal/service/organization_service.go` | ✅ |
| 1.6 | Workspace Service | `backend/internal/service/workspace_service.go` | ✅ |
| 1.7 | Invitation Service | `backend/internal/service/invitation_service.go` | ✅ |
| 1.8 | WorkspaceRole Service | `backend/internal/service/role_service.go` | ✅ |
| 1.9 | Organization Controller | `backend/internal/controller/organization_controller.go` | ✅ |
| 1.10 | Workspace Controller | `backend/internal/controller/workspace_controller.go` | ✅ |
| 1.11 | Invitation Controller | `backend/internal/controller/invitation_controller.go` | ✅ |

### Chi tiết DTOs

```go
// Organization DTOs
- CreateOrganizationRequest { name, description, logo_url }
- UpdateOrganizationRequest { name, description, logo_url, allow_invite_link, max_members }
- OrganizationResponse { id, name, slug, description, logo_url, owner, member_count, workspace_count, invite_code, ... }
- OrganizationListResponse { organizations[], total, page, limit }

// Workspace DTOs
- CreateWorkspaceRequest { name, description, color, icon, admin_id, is_billable, hourly_rate, start_date, end_date }
- UpdateWorkspaceRequest { name, description, color, icon, is_active, is_billable, hourly_rate, start_date, end_date }
- WorkspaceResponse { id, name, slug, description, color, icon, admin, organization, member_count, task_count, ... }
- WorkspaceListResponse { workspaces[], total, page, limit }

// Member DTOs
- AddMemberRequest { user_id, role }
- UpdateMemberRequest { role, is_active }
- MemberResponse { id, user, role, joined_at, is_active, invited_by }
- WorkspaceMemberRequest { user_id, workspace_role_id, is_admin, can_view_reports, can_manage_tasks }

// Invitation DTOs
- CreateInvitationRequest { email, org_role, workspace_id?, workspace_role_id?, message, expires_in_days }
- InvitationResponse { id, email, org_role, workspace, status, expires_at, invited_by, ... }
- JoinByCodeRequest { invite_code }
- AcceptInvitationRequest { token }

// Role DTOs
- CreateRoleRequest { name, display_name, description, color, permissions, is_default }
- UpdateRoleRequest { display_name, description, color, permissions, is_default, sort_order }
- RoleResponse { id, name, display_name, description, color, permissions, is_default, sort_order }
```

---

## 🔐 PHASE 2: AUTHORIZATION SYSTEM (Phân quyền)

### Mục tiêu
Xây dựng middleware và helper functions để kiểm tra quyền ở các cấp độ khác nhau.

### Tasks

| ID | Task | File | Status |
|----|------|------|:------:|
| 2.1 | Permission Constants | `backend/internal/middleware/permissions.go` | ✅ |
| 2.2 | Authorization Middleware | `backend/internal/middleware/authorization.go` | ✅ |
| 2.3 | Permission Helper Functions | `backend/internal/utils/permissions.go` | ✅ |
| 2.4 | Update Auth Middleware | `backend/internal/middleware/auth.go` | ✅ |
| 2.5 | Admin-only Middleware | `backend/internal/middleware/admin.go` | ✅ |
| 2.6 | Update User Repository | Add GetUserWithOrgContext | ✅ |

### Chi tiết Middleware

```go
// Permission levels
const (
    PermSystemAdmin     = "system:admin"
    PermOrgOwner        = "org:owner"
    PermOrgAdmin        = "org:admin"
    PermOrgMember       = "org:member"
    PermWorkspaceAdmin  = "workspace:admin"
    PermWorkspaceMember = "workspace:member"
)

// Middleware functions
- RequireSystemAdmin()     // Chỉ system admin
- RequireOrgOwner()        // Owner của organization
- RequireOrgAdmin()        // Owner hoặc admin của org
- RequireOrgMember()       // Thành viên của org
- RequireWorkspaceAdmin()  // Admin của workspace
- RequireWorkspaceMember() // Thành viên của workspace

// Helper functions
- GetUserOrgRole(userID, orgID) string
- GetUserWorkspaceRole(userID, workspaceID) string
- CanManageOrg(userID, orgID) bool
- CanManageWorkspace(userID, workspaceID) bool
- CanDeleteWorkspace(userID, orgID) bool
- CanManageMembers(userID, orgID/workspaceID) bool
- CanViewAllData(userID) bool
```

---

## 📝 PHASE 3: REGISTRATION FLOW UPDATE

### Mục tiêu
Cập nhật flow đăng ký để user có thể chọn tạo organization mới hoặc join organization có sẵn.

### Tasks

| ID | Task | File | Status |
|----|------|------|:------:|
| 3.1 | Update RegisterRequest DTO | `backend/internal/dto/dto.go` | ✅ |
| 3.2 | Update Auth Service Register | `backend/internal/service/auth_service.go` | ✅ |
| 3.3 | Create Default Roles Helper | `backend/internal/utils/default_roles.go` | ✅ |
| 3.4 | Update User Response | Include org/workspace info | ✅ |

### Chi tiết

```go
// Updated RegisterRequest
type RegisterRequest struct {
    Email           string `json:"email" binding:"required,email"`
    Password        string `json:"password" binding:"required,min=8"`
    FirstName       string `json:"first_name" binding:"required"`
    LastName        string `json:"last_name" binding:"required"`
    
    // Organization options
    CreateOrg       bool   `json:"create_org"`           // true: tạo org mới
    OrgName         string `json:"org_name"`             // Tên org nếu create_org = true
    JoinOrgCode     string `json:"join_org_code"`        // Code để join org có sẵn
    InvitationToken string `json:"invitation_token"`     // Token từ email invitation
}

// Registration flow:
// 1. Validate user data
// 2. Create user
// 3. If create_org = true:
//    - Create new organization with user as owner
//    - Create default workspace roles
// 4. If join_org_code provided:
//    - Find org by invite code
//    - Add user as member
// 5. If invitation_token provided:
//    - Validate and accept invitation
//    - Add to org/workspace based on invitation
// 6. Return user with org context
```

---

## 🛣️ PHASE 4: ROUTER & INTEGRATION

### Mục tiêu
Setup routes và tích hợp tất cả các components.

### Tasks

| ID | Task | File | Status |
|----|------|------|:------:|
| 4.1 | Organization Routes | `backend/internal/router/router.go` | ✅ |
| 4.2 | Workspace Routes | `backend/internal/router/router.go` | ✅ |
| 4.3 | Invitation Routes | `backend/internal/router/router.go` | ✅ |
| 4.4 | Update main.go | `backend/cmd/server/main.go` | ✅ |
| 4.5 | Update SetupRouter | Inject new controllers | ✅ |

### API Endpoints

```
# Organizations
GET    /api/v1/organizations                    # List user's organizations
POST   /api/v1/organizations                    # Create organization (owner)
GET    /api/v1/organizations/:id                # Get organization details
PUT    /api/v1/organizations/:id                # Update organization
DELETE /api/v1/organizations/:id                # Delete organization (owner only)
POST   /api/v1/organizations/:id/regenerate-code # Regenerate invite code
GET    /api/v1/organizations/:id/members        # List members
POST   /api/v1/organizations/:id/members        # Add member
PUT    /api/v1/organizations/:id/members/:uid   # Update member role
DELETE /api/v1/organizations/:id/members/:uid   # Remove member
GET    /api/v1/organizations/join/:code         # Get org info by invite code
POST   /api/v1/organizations/join/:code         # Join organization by code

# Workspace Roles (Organization-level)
GET    /api/v1/organizations/:id/roles          # List roles
POST   /api/v1/organizations/:id/roles          # Create role
PUT    /api/v1/organizations/:id/roles/:rid     # Update role
DELETE /api/v1/organizations/:id/roles/:rid     # Delete role (owner only)

# Workspaces
GET    /api/v1/organizations/:id/workspaces     # List workspaces in org
POST   /api/v1/organizations/:id/workspaces     # Create workspace
GET    /api/v1/workspaces/:id                   # Get workspace details
PUT    /api/v1/workspaces/:id                   # Update workspace
DELETE /api/v1/workspaces/:id                   # Delete workspace (org owner only)
GET    /api/v1/workspaces/:id/members           # List workspace members
POST   /api/v1/workspaces/:id/members           # Add member to workspace
PUT    /api/v1/workspaces/:id/members/:uid      # Update member role/permissions
DELETE /api/v1/workspaces/:id/members/:uid      # Remove member from workspace

# Invitations
GET    /api/v1/organizations/:id/invitations    # List pending invitations
POST   /api/v1/organizations/:id/invitations    # Create invitation
DELETE /api/v1/invitations/:id                  # Revoke invitation
GET    /api/v1/invitations/accept/:token        # Get invitation info
POST   /api/v1/invitations/accept/:token        # Accept invitation

# User Context
GET    /api/v1/users/me/organizations           # Get user's orgs with roles
GET    /api/v1/users/me/workspaces              # Get user's workspaces with roles
PUT    /api/v1/users/me/current-context         # Set current org/workspace

# Admin Only (System Admin)
GET    /api/v1/admin/users                      # List all users
DELETE /api/v1/admin/users/:id                  # Delete user
GET    /api/v1/admin/tasks                      # List all tasks
DELETE /api/v1/admin/tasks/:id                  # Delete any task
GET    /api/v1/admin/timelogs                   # List all timelogs
DELETE /api/v1/admin/timelogs/:id               # Delete any timelog
```

---

## 🖥️ PHASE 5: FRONTEND WEB (React)

### Mục tiêu
Xây dựng UI quản lý Organization và Workspace trên web admin.

### Tasks

| ID | Task | File | Status |
|----|------|------|:------:|
| 5.1 | Organization Store | `frontend/src/store/organizationStore.ts` | ✅ |
| 5.2 | Organization Service | `frontend/src/services/organizationService.ts` | ✅ |
| 5.3 | Workspace Service | `frontend/src/services/workspaceService.ts` | ✅ |
| 5.4 | Invitation Service | `frontend/src/services/invitationService.ts` | ✅ |
| 5.5 | Organization Types | `frontend/src/services/organizationService.ts` | ✅ |
| 5.6 | OrganizationsPage | `frontend/src/pages/OrganizationsPage.tsx` | ✅ |
| 5.7 | OrganizationDetailPage | `frontend/src/pages/OrganizationDetailPage.tsx` | ✅ |
| 5.8 | WorkspacesPage | `frontend/src/pages/OrganizationDetailPage.tsx (Workspaces tab)` | ✅ |
| 5.9 | WorkspaceDetailPage | `frontend/src/pages/OrganizationDetailPage.tsx (Workspaces tab)` | ✅ |
| 5.10 | MembersManagement Component | `frontend/src/pages/OrganizationDetailPage.tsx (Members tab)` | ✅ |
| 5.11 | InvitationManagement Component | `frontend/src/pages/OrganizationDetailPage.tsx (Invitations tab)` | ✅ |
| 5.12 | RoleManagement Component | `frontend/src/pages/OrganizationDetailPage.tsx (Roles tab)` | ✅ |
| 5.13 | OrgWorkspaceSwitcher Component | `frontend/src/components/Navbar.tsx` | ✅ |
| 5.14 | Update Layout | Add org/workspace switcher | ✅ |
| 5.15 | Update App.tsx | Add new routes | ✅ |
| 5.16 | Update AuthStore | Add org/workspace context | ✅ |
| 5.17 | Update existing pages | Filter by workspace | ⬜ (Future) |
| 5.18 | Admin Panel | User management for system admin | ⬜ (Future) |

---

## 💻 PHASE 6: ELECTRON APP

### Mục tiêu
Tích hợp Organization và Workspace vào desktop app.

### Tasks

| ID | Task | File | Status |
|----|------|------|:------:|
| 6.1 | Organization Service | `electron/src/renderer/services/organizationService.ts` | ✅ |
| 6.2 | Workspace Service | `electron/src/renderer/services/organizationService.ts` | ✅ |
| 6.3 | Organization Types | `electron/src/renderer/services/organizationService.ts` | ✅ |
| 6.4 | OrgWorkspaceSelector Component | `electron/src/renderer/components/WorkspaceSelector.tsx` | ✅ |
| 6.5 | Update TimeTracker | Add org/workspace context | ✅ |
| 6.6 | Update Settings | Show org/workspace info | ⬜ (Future) |
| 6.7 | Update Sync Service | Include org/workspace in sync | ⬜ (Future) |
| 6.8 | Update Local Database | Store current org/workspace | ✅ |
| 6.9 | Update IPC handlers | Org/workspace operations | ⬜ (Future) |
| 6.10 | Update TasksView | Filter by workspace | ⬜ (Future) |

---

## 🔄 Dependencies & Order

```
Phase 1 (DTOs, Services, Controllers)
    │
    ▼
Phase 2 (Authorization Middleware)
    │
    ▼
Phase 3 (Registration Flow)
    │
    ▼
Phase 4 (Router Integration)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 5 (Frontend)   Phase 6 (Electron)
    │                  │
    └────────┬─────────┘
             ▼
        Testing & QA
```

---

## ✅ Progress Tracking

### Overall Progress
- [ ] Phase 1: Backend Core (0/11)
- [ ] Phase 2: Authorization (0/6)
- [ ] Phase 3: Registration Flow (0/4)
- [ ] Phase 4: Router Integration (0/5)
- [ ] Phase 5: Frontend Web (0/18)
- [ ] Phase 6: Electron App (0/10)

### Current Phase: **Phase 1**
### Current Task: **1.1 - DTOs cho Organization**

---

## 📝 Notes

- Database migration 010 đã tồn tại với schema đầy đủ
- Models đã được định nghĩa trong `models.go`
- Repositories cho Organization, Workspace, Invitation đã có sẵn
- Cần bổ sung Services, Controllers, và DTOs

---

## 🐛 Known Issues

*None yet*

---

## 📚 References

- [copilot-instructions.md](.github/copilot-instructions.md) - Yêu cầu bổ sung II & III
- [backend/migrations/010_add_organizations_workspaces.up.sql](backend/migrations/010_add_organizations_workspaces.up.sql) - Database schema
- [backend/internal/models/models.go](backend/internal/models/models.go) - Model definitions
