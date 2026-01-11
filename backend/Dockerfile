# Backend Dockerfile
FROM golang:1.21-alpine AS builder

# Install dependencies
RUN apk add --no-cache git gcc musl-dev

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build application
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o server cmd/server/main.go

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata bash

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/server /app

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 8080

# Start run server
CMD ["./server"]
