```prompt
# TODO v06-01: Electron Presence Heartbeat

## Mục tiêu

Cập nhật Electron app để gửi heartbeat trạng thái working/idle về backend theo thời gian thực.

## Yêu cầu

- Gọi API POST /api/v1/presence/heartbeat khi:
  - Start time tracker → status=working
  - Pause/Stop time tracker → status=idle
- Tạo heartbeat định kỳ (interval lấy từ config; mặc định 15s) khi app đang chạy.
- Khi offline, queue request và retry theo FIFO.
- Gắn device_id nếu có.
- Không làm gián đoạn luồng time tracker hiện tại.

## Files cần cập nhật

- electron/src/main/** (IPC nếu cần)
- electron/src/renderer/** (service call, state machine)
- electron/src/renderer/services/** (API client)

## Output mong muốn

- Presence status được cập nhật realtime lên admin web.
- Không gây quá tải request (có debounce/throttle nếu cần).
- Có log debug rõ ràng cho heartbeat success/fail.

## Trạng thái

- Status: completed
- Owner: copilot
- Priority: high

## Ghi chú hoàn thành

- Đã thêm presence service + heartbeat queue/offline retry.
- Time tracker UI gửi heartbeat ở start/pause/resume/stop và interval.
```
