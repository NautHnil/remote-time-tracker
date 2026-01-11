package utils

import (
	"math/rand"
	"regexp"
	"strings"
	"time"
)

const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const inviteCodeCharset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Avoiding ambiguous characters

var seededRand *rand.Rand = rand.New(rand.NewSource(time.Now().UnixNano()))

// GenerateRandomString generates a random string of given length
func GenerateRandomString(length int) string {
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(b)
}

// GenerateInviteCode generates a random invite code for organizations
// Format: XXXX-XXXX-XXXX (12 chars without dashes)
func GenerateInviteCode() string {
	code := make([]byte, 12)
	for i := range code {
		code[i] = inviteCodeCharset[seededRand.Intn(len(inviteCodeCharset))]
	}
	return string(code[:4]) + "-" + string(code[4:8]) + "-" + string(code[8:])
}

// GenerateSlug generates a URL-friendly slug from a string
func GenerateSlug(s string) string {
	// Convert to lowercase
	slug := strings.ToLower(s)

	// Replace spaces with dashes
	slug = strings.ReplaceAll(slug, " ", "-")

	// Remove all non-alphanumeric characters except dashes
	reg := regexp.MustCompile("[^a-z0-9-]")
	slug = reg.ReplaceAllString(slug, "")

	// Replace multiple dashes with single dash
	reg = regexp.MustCompile("-+")
	slug = reg.ReplaceAllString(slug, "-")

	// Trim dashes from start and end
	slug = strings.Trim(slug, "-")

	// Append random suffix to ensure uniqueness
	suffix := GenerateRandomString(6)
	if slug == "" {
		return suffix
	}

	return slug + "-" + suffix
}

// GenerateInviteToken generates a random token for invitations
func GenerateInviteToken() string {
	return GenerateRandomString(32)
}

// Ptr returns a pointer to the given value
func Ptr[T any](v T) *T {
	return &v
}

// CalculateDuration calculates duration in seconds between two times
func CalculateDuration(start, end time.Time) int64 {
	return int64(end.Sub(start).Seconds())
}

// CalculatePaginationPages calculates total pages for pagination
func CalculatePaginationPages(total int64, perPage int) int {
	if total == 0 {
		return 0
	}
	pages := int(total) / perPage
	if int(total)%perPage > 0 {
		pages++
	}
	return pages
}
