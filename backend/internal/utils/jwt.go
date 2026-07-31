package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"remote-time-tracker.dev/internal/config"
)

// JWTClaims represents JWT token claims
type JWTClaims struct {
	UserID     uint   `json:"user_id"`
	Email      string `json:"email"`
	Role       string `json:"role"`
	SystemRole string `json:"system_role"`
	CMSAccess  bool   `json:"cms_access"`
	jwt.RegisteredClaims
}

// GenerateToken generates a new JWT token
func GenerateToken(userID uint, email, role, systemRole string) (string, time.Time, error) {
	return generateToken(userID, email, role, systemRole, false, config.AppConfig.JWT.Expiry)
}

// GenerateCMSToken generates a JWT token authorized for CMS routes.
func GenerateCMSToken(userID uint, email, role, systemRole string) (string, time.Time, error) {
	return generateToken(userID, email, role, systemRole, true, config.AppConfig.JWT.Expiry)
}

func generateToken(userID uint, email, role, systemRole string, cmsAccess bool, expiry time.Duration) (string, time.Time, error) {
	cfg := config.AppConfig.JWT

	expirationTime := time.Now().Add(expiry)

	claims := &JWTClaims{
		UserID:     userID,
		Email:      email,
		Role:       role,
		SystemRole: systemRole,
		CMSAccess:  cmsAccess,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(cfg.Secret))
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expirationTime, nil
}

// GenerateRefreshToken generates a refresh token
func GenerateRefreshToken(userID uint, email, role, systemRole string) (string, time.Time, error) {
	return generateToken(userID, email, role, systemRole, false, config.AppConfig.JWT.RefreshExpiry)
}

// GenerateCMSRefreshToken generates a refresh token that preserves CMS access.
func GenerateCMSRefreshToken(userID uint, email, role, systemRole string) (string, time.Time, error) {
	return generateToken(userID, email, role, systemRole, true, config.AppConfig.JWT.RefreshExpiry)
}

// ValidateToken validates a JWT token and returns the claims
func ValidateToken(tokenString string) (*JWTClaims, error) {
	cfg := config.AppConfig.JWT

	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(cfg.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
