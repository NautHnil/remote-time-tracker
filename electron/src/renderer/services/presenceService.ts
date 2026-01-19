/**
 * Presence Service
 * Handles presence heartbeat updates
 */

import { apiClient } from "./apiClient";
import { API_ENDPOINTS } from "./config";

export type PresenceStatus = "working" | "idle";

interface PresenceHeartbeatRequest {
  status: PresenceStatus;
  device_id?: number;
}

interface PresenceHeartbeatResponse {
  status: PresenceStatus;
  last_presence_at: string;
  last_working_at?: string | null;
}

interface QueueItem {
  payload: PresenceHeartbeatRequest;
  retryCount: number;
}

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;
const MIN_SEND_INTERVAL = 5000;
const MAX_QUEUE_SIZE = 20;

let queue: QueueItem[] = [];
let isProcessing = false;
let lastSentAt = 0;
let lastSentStatus: PresenceStatus | null = null;
let onlineListenerRegistered = false;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendHeartbeat = async (payload: PresenceHeartbeatRequest) =>
  apiClient.post<PresenceHeartbeatResponse>(
    API_ENDPOINTS.PRESENCE.HEARTBEAT,
    payload,
  );

const shouldThrottle = (status: PresenceStatus) => {
  const now = Date.now();
  if (lastSentStatus === status && now - lastSentAt < MIN_SEND_INTERVAL) {
    return true;
  }
  return false;
};

const markSent = (status: PresenceStatus) => {
  lastSentAt = Date.now();
  lastSentStatus = status;
};

const processQueue = async () => {
  if (isProcessing || !navigator.onLine) return;
  isProcessing = true;

  while (queue.length > 0) {
    const item = queue[0];
    try {
      await sendHeartbeat(item.payload);
      markSent(item.payload.status);
      queue.shift();
    } catch (error) {
      item.retryCount += 1;
      if (item.retryCount >= MAX_RETRIES) {
        queue.shift();
      } else {
        await delay(RETRY_DELAY * item.retryCount);
      }
      break;
    }
  }

  isProcessing = false;
};

const enqueue = (payload: PresenceHeartbeatRequest) => {
  const last = queue[queue.length - 1];
  if (last && last.payload.status === payload.status) {
    last.payload = payload;
    last.retryCount = 0;
  } else {
    queue.push({ payload, retryCount: 0 });
  }

  if (queue.length > MAX_QUEUE_SIZE) {
    queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
  }

  processQueue();
};

const ensureOnlineListener = () => {
  if (onlineListenerRegistered) return;
  onlineListenerRegistered = true;
  window.addEventListener("online", () => {
    processQueue();
  });
};

export const presenceService = {
  /**
   * Send a heartbeat update (queued if offline)
   */
  async heartbeat(status: PresenceStatus, deviceId?: number) {
    ensureOnlineListener();

    if (shouldThrottle(status)) {
      return { success: true, throttled: true };
    }

    const payload: PresenceHeartbeatRequest = {
      status,
      device_id: deviceId,
    };

    if (!navigator.onLine) {
      enqueue(payload);
      return { success: false, queued: true };
    }

    try {
      await sendHeartbeat(payload);
      markSent(status);
      return { success: true };
    } catch (error) {
      enqueue(payload);
      return { success: false, queued: true };
    }
  },

  /**
   * Flush any queued heartbeats
   */
  flush: async () => {
    await processQueue();
  },
};

export default presenceService;
