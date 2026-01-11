# Remote Time Tracker - AI Coding Agent Instructions

## ROLE

Bạn là kiến trúc sư hệ thống + kỹ sư Golang/React/Electron mức senior.  
Nhiệm vụ: tự động sinh code hoàn chỉnh, tối ưu, có cấu trúc theo chuẩn production cho toàn bộ dự án.

## MỤC TIÊU DỰ ÁN

Xây dựng phần mềm theo mô tả: ứng dụng tracking thời gian làm việc (Start – Pause – Stop) + screenshot đa màn hình + sync offline/online + task time manager.

## STACK CÔNG NGHỆ

- Backend: Golang (GIN, GORM)
- Frontend Web: ReactJS
- Desktop App: ElectronJS (Win/Mac/Linux)
- Database: PostgreSQL
- REST APIs
- Local caching: SQLite/IndexedDB
- Đồng bộ dữ liệu: background sync service

## YÊU CẦU HỆ THỐNG

### 1. Desktop App (ElectronJS)

- UI Start / Pause / Stop
- State machine: idle → running → paused → stopped
- Tính giờ + lưu log local
- Screenshot tất cả màn hình theo interval
- Lưu offline nếu mất mạng
- Sync lại khi có mạng
- Tự chạy nền (system tray)
- Hỗ trợ auto-update (Electron Builder)
- Màn hình quản lý task + đặt title
- Mã hóa screenshot trước khi upload (AES256 optional)

### 2. Backend (Golang – GIN + GORM)

Module cần sinh code:

- Auth (JWT)
- Users
- Tasks
- TimeLogs (start–pause–stop)
- Screenshots
- Sync APIs (batch upload từ Electron)
- Device info
- Healthcheck
- Audit log

Yêu cầu:

- Viết theo service + repository pattern
- Logging chuẩn
- Middleware Auth
- Migration PostgreSQL
- Tối ưu performance (gorm config, batch insert)

### 3. Database (PostgreSQL)

Tạo schema:

- `users`
- `tasks`
- `timelogs`
- `screenshots`
- `device_info`
- `sync_logs`

Các bảng khác cần thiết cho chức năng.

### 4. Frontend (ReactJS)

Trang cần sinh code:

- Dashboard tổng thời gian
- Task manager
- Timeline work sessions
- Screenshot viewer
- User settings
- Responsive UI
- State được quản lý bằng React Context/Zustand

### 5. LOGIC TRỌNG TÂM

- Máy trạng thái thời gian làm việc
- Auto screenshot
- Queue upload offline-first
- FIFO priority cho sync
- Retry gửi dữ liệu
- Kiểm tra kết nối mạng
- Validate dữ liệu trước khi push về server

## CÁCH HOẠT ĐỘNG CỦA COPILOT

### Tạo file

→ Phải tự động tạo file hoàn chỉnh, đầy đủ logic, có comment.

### Tạo module backend

→ Xuất toàn bộ:

- folder structure
- router
- controller
- service
- repository
- migration
- model
- DTO

### Tạo UI React

→ Tạo component hoàn chỉnh + hook + service call.

### Tạo logic Electron

→ Tạo main process + preload + renderer + IPC logic.

### Không trả về code tối thiểu

Luôn xuất **phiên bản production-ready**.

## TÍNH NĂNG MỞ RỘNG

Triển khai phần CURD "Tasks manager".

1. Khi "Stop & Save" time track, mở lên modal dialog để user save task time title (optional). Nếu không có title, sẽ save title mặc định.
2. List danh sách task show ra đủ các thông tin, title, start_time, end_time, pause_time,...
3. Có thể edit nhanh title ngay tại list danh sách.
4. Mở rộng, phân biệt rõ các screenshots thuộc session(task) nào.
5. Khi xem chi tiết task, có thể thấy được thông tin task và list screenshots thuộc task_id đó.

I. Yêu cầu bổ sung 01:
Trong task manager, có phần tạo mới task. Khi tạo mới sẽ chưa tính time track.

1. Update lại UI + logic, để phân biệt task tạo mới thủ công từ "Create new task" với task được sync từ việc Start Time tracker.
2. Đối với task được start từ time tracker, sẽ không có các nút action [Start/Pause/Stop], chỉ có thể xem chi tiết hoặc edit title.
3. Đối với task tạo mới thủ công, sẽ có đầy đủ các nút action [Start/Pause/Stop] để user có thể bắt đầu theo dõi thời gian cho task đó. Lưu ý, khi user nhấn "Start" trên task này, sẽ bắt đầu một phiên time track mới, và khi "Stop" sẽ lưu lại session time track cho task này. Trong cùng thời điểm, user vẫn có thể tạo thêm các task mới khác nhưng không thể cùng lúc chạy nhiều phiên time track.
4. Cập nhật backend để phân biệt hai loại task này, thêm trường `is_manual` (boolean) trong bảng `tasks` để xác định task nào là tạo thủ công, task nào là từ time tracker.
5. Cập nhật API tương ứng để hỗ trợ CRUD cho cả hai loại task.
6. Cập nhật UI task list để hiển thị rõ ràng loại task (manual hay từ time tracker).
7. Cập nhật logic sync để đồng bộ đúng loại task với server.
8. Cập nhật phần hiển thị chi tiết task để show thông tin liên quan đến loại task.
9. Tại Time tracker UI, thêm phần lựa chọn để user có thể chọn task hiện tại đang theo dõi từ danh sách task đã tạo.
10. Tại Time tracker UI, hiển thị rõ ràng task hiện tại đang theo dõi, bao gồm cả thông tin nếu đó là task tạo thủ công hay từ time tracker.
11. Tại Time tracker UI, khi user nhấn "Stop", nếu task hiện tại là task tạo thủ công, sẽ lưu session time track vào task đó.
12. Tại Time tracker UI, nếu user muốn chuyển đổi giữa các task đang theo dõi, sẽ có tùy chọn để dừng task hiện tại và bắt đầu theo dõi task khác từ danh sách.
13. Tại Time tracker UI, update logic real-time time-tracked (hiển thị dạng 1h:23m:45s) cho task hiện tại đang theo dõi, bao gồm cả task tạo thủ công. Update logic real-time phần count screenshot theo interval cho task hiện tại.
14. Đảm bảo tất cả các thay đổi đều được kiểm tra kỹ lưỡng và hoạt động mượt mà trên cả desktop app và backend.

II. Yêu cầu bổ sung 02:
Thêm tính năng quản lý organization và workspace(project) cho user (owner, members).

1. Mỗi user có thể thuộc về một hoặc nhiều organization.
2. Toàn bộ users, sẽ thuộc về một organization cụ thể.
3. Mỗi organization có thể có nhiều workspace(project), sẽ assign một member cụ thể trong organization làm admin(project manager) cho workspace.
4. Khi đăng ký tài khoản mới, user sẽ được lựa chọn tạo organization mới(bản thân user sẽ làm owner organization) hoặc tham gia vào organization đã có sẵn qua invitation link (hoặc code riêng của organization) làm member.
5. Mỗi workspace có thể có nhiều user members với vai trò khác nhau (pm, ba, dev, ... các vai trò này được thoải mái tạo mới do admin tạo).
6. Để tránh việc tạo quá nhiều vai trò không cần thiết, hoặc khác tên nhưng cùng ý nghĩa, thì các role này nên đẩy thành dữ liệu chung cho toàn organization, khi tạo workspace mới, sẽ lấy lại các role này để assign cho members trong workspace. Nếu không có role phù hợp, admin của workspace có thể tạo mới role.
7. Chỉ admin của workspace mới có quyền tạo/sửa(không có quyền xóa, quyền này thuộc về owner organization) workspace và quản lý members(lấy thêm members từ organization vào workspace).
8. Cập nhật database schema để tạo bảng `organizations`, `workspaces`, và bảng liên kết `organization_members`, `workspace_members`.
9. Cập nhật API backend để hỗ trợ quản lý organization và workspace.
10. Cập nhật UI React để hiển thị và quản lý organization và workspace.
11. Cập nhật logic Electron để hỗ trợ chức năng liên quan đến organization và workspace.
12. Đảm bảo tất cả các thay đổi đều được kiểm tra kỹ lưỡng và hoạt động mượt mà trên cả desktop app và backend.

III. Yêu cầu bổ sung 03:
Thêm tính năng phân quyền quản trị.

1. Mỗi user có thể có vai trò khác nhau: admin, member.
2. Chỉ admin mới có quyền tạo/xoá user khác.
3. Chỉ admin mới có quyền xem/xoá tất cả các task và time logs của tất cả user.
4. Member chỉ có quyền xem/xoá task và time logs của chính mình.
5. Cập nhật database schema để thêm trường `role` trong bảng `users`.
6. Cập nhật API backend để kiểm tra quyền trước khi thực hiện các hành động quản trị.
7. Cập nhật UI React để ẩn/hiện các chức năng quản trị dựa trên vai trò user.
8. Cập nhật logic Electron để hiển thị đúng chức năng dựa trên vai trò user.
9. Đảm bảo tất cả các thay đổi đều được kiểm tra kỹ lưỡng và hoạt động mượt mà trên cả desktop app và backend.

## OUTPUT FORMAT MONG MUỐN

Copilot cần trả về theo format sau:

1. **Kiến trúc đề xuất**
2. **Cấu trúc thư mục**
3. **Code chi tiết**
4. **Giải thích ngắn gọn**
5. **Gợi ý mở rộng**

Ưu tiên trả về đầy đủ code trong 1 lần nếu có thể.

## GHI CHÚ

Prompt này đóng vai trò **master instruction** cho toàn dự án.  
Copilot phải đọc theo và tuân thủ mọi file trong workspace.
