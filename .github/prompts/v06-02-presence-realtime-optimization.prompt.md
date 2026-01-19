```prompt
# TODO v06-02: Presence Realtime Optimization (SSE/WebSocket)

## Mục tiêu

Tối ưu realtime status cho admin web bằng SSE/WebSocket thay vì polling, giảm tải hệ thống khi scale lớn.

## Yêu cầu

- Backend cung cấp stream trạng thái presence theo organization/workspace hoặc toàn hệ thống (admin).
- Frontend admin subscribe stream và cập nhật UI realtime.
- Có cơ chế reconnect + backoff.
- Bảo mật: chỉ system admin được subscribe.

## Files cần cập nhật

- backend/internal/controller/**
- backend/internal/router/router.go
- backend/internal/service/**
- frontend/src/pages/admin/**
- frontend/src/services/**

## Trạng thái

- Status: completed
- Owner: copilot
- Priority: medium

## Ghi chú hoàn thành

- Backend SSE presence stream cho admin + reconnect/backoff trên frontend.
```
