# TODO 01: Database Schema Review

## Mục tiêu

Rà soát và cập nhật database schema để đảm bảo hỗ trợ đầy đủ chức năng admin web interface.

## Yêu cầu

### 1. Kiểm tra bảng `users`

- [x] Trường `system_role` (admin, member) - **ĐÃ CÓ**
- [x] Trường `role` (legacy: admin, manager, user) - **ĐÃ CÓ**
- [x] Method `IsSystemAdmin()` - **ĐÃ CÓ**
- [ ] Đảm bảo index cho `system_role` để query hiệu quả

### 2. Kiểm tra bảng `organizations`

- [x] Các trường cơ bản - **ĐÃ CÓ**
- [ ] Thêm trường `is_verified` (boolean) cho admin verify organization
- [ ] Thêm trường `notes` (text) cho admin ghi chú

### 3. Kiểm tra bảng `workspaces`

- [x] Các trường cơ bản - **ĐÃ CÓ**
- [ ] Thêm trường `is_archived` (boolean) cho admin archive workspace

### 4. Kiểm tra bảng `tasks`

- [x] Các trường cơ bản - **ĐÃ CÓ**
- [ ] Thêm trường `admin_notes` (text) cho admin ghi chú

### 5. Kiểm tra bảng `time_logs`

- [x] Các trường cơ bản - **ĐÃ CÓ**
- [ ] Thêm trường `is_approved` (boolean) cho admin approve time log
- [ ] Thêm trường `approved_by` (uint) FK đến users
- [ ] Thêm trường `approved_at` (timestamp)

### 6. Kiểm tra bảng `audit_logs`

- [x] Các trường cơ bản - **ĐÃ CÓ**
- [ ] Đảm bảo ghi nhận đầy đủ các action của admin

## Files cần chỉnh sửa

```
backend/internal/models/models.go
backend/cmd/migrate/main.go
```

## Tasks chi tiết

### Task 1.1: Cập nhật User model

```go
// Thêm index cho system_role
SystemRole string `gorm:"size:20;default:'member';index" json:"system_role"`
```

### Task 1.2: Cập nhật Organization model

```go
// Thêm các trường mới
IsVerified    bool      `gorm:"default:false" json:"is_verified"`
VerifiedAt    *time.Time `json:"verified_at"`
VerifiedBy    *uint     `json:"verified_by"`
AdminNotes    string    `gorm:"type:text" json:"admin_notes"`
```

### Task 1.3: Cập nhật Workspace model

```go
// Thêm trường archive
IsArchived    bool      `gorm:"default:false" json:"is_archived"`
ArchivedAt    *time.Time `json:"archived_at"`
ArchivedBy    *uint     `json:"archived_by"`
```

### Task 1.4: Cập nhật Task model

```go
// Thêm trường admin notes
AdminNotes    string    `gorm:"type:text" json:"admin_notes"`
```

### Task 1.5: Cập nhật TimeLog model

```go
// Thêm các trường approval
IsApproved    bool       `gorm:"default:false" json:"is_approved"`
ApprovedBy    *uint      `json:"approved_by"`
ApprovedAt    *time.Time `json:"approved_at"`
AdminNotes    string     `gorm:"type:text" json:"admin_notes"`
```

## Migration script

```go
// Tạo migration file mới
// backend/cmd/migrate/migrations/YYYYMMDD_admin_fields.go

func AddAdminFields(db *gorm.DB) error {
    // Auto migrate sẽ thêm các trường mới
    return db.AutoMigrate(
        &models.User{},
        &models.Organization{},
        &models.Workspace{},
        &models.Task{},
        &models.TimeLog{},
    )
}
```

## Acceptance Criteria

- [ ] Tất cả các trường mới được thêm vào models
- [ ] Migration chạy thành công không lỗi
- [ ] Không ảnh hưởng đến dữ liệu hiện có
- [ ] Index được tạo cho các trường cần query

## Dependencies

- Không có dependency

## Estimated Time

- 1-2 giờ

## Notes

- Cần backup database trước khi migrate
- Test trên môi trường development trước
- Các trường mới đều có giá trị default để không ảnh hưởng dữ liệu cũ
