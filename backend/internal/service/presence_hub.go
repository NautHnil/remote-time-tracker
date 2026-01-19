package service

import (
	"encoding/json"
	"sync"
	"time"
)

// PresenceEvent represents a presence update payload
type PresenceEvent struct {
	UserID         uint       `json:"user_id"`
	Status         string     `json:"status"`
	LastPresenceAt time.Time  `json:"last_presence_at"`
	LastWorkingAt  *time.Time `json:"last_working_at"`
}

// PresenceHub manages presence event subscribers
type PresenceHub struct {
	mu          sync.RWMutex
	subscribers map[chan []byte]struct{}
}

// NewPresenceHub creates a new PresenceHub
func NewPresenceHub() *PresenceHub {
	return &PresenceHub{
		subscribers: make(map[chan []byte]struct{}),
	}
}

// Subscribe registers a new subscriber channel
func (h *PresenceHub) Subscribe() chan []byte {
	ch := make(chan []byte, 20)
	h.mu.Lock()
	h.subscribers[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

// Unsubscribe removes a subscriber channel
func (h *PresenceHub) Unsubscribe(ch chan []byte) {
	h.mu.Lock()
	if _, ok := h.subscribers[ch]; ok {
		delete(h.subscribers, ch)
		close(ch)
	}
	h.mu.Unlock()
}

// Broadcast sends presence event to all subscribers
func (h *PresenceHub) Broadcast(event PresenceEvent) {
	payload, err := json.Marshal(event)
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.subscribers {
		select {
		case ch <- payload:
		default:
		}
	}
}

// PresenceBroadcaster is a global hub instance
var PresenceBroadcaster = NewPresenceHub()
