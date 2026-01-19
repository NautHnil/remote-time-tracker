.PHONY: help start start-be start-fe start-db stop stop-be stop-fe stop-db restart logs logs-be logs-fe logs-db clean build rebuild rebuild-be rebuild-fe dev-be dev-fe dev-app build-app build-swag install-be install-fe install-app install-all test-be test-fe db-shell db-reset status debug-be health backup-db restore-db prune

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

start: ## Start all services with docker-compose
	@echo "🚀 Starting Remote Time Tracker..."
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "📊 Backend API: http://localhost:8080"
	@echo "🌐 Frontend: http://localhost:3000"
	@echo "🗄️  PostgreSQL: localhost:5432"

start-be: ## Start backend service
	@echo "🚀 Starting backend service..."
	docker-compose up -d backend
	@echo "✅ Backend service started!"
	@echo "📊 Backend API: http://localhost:8080"

start-fe: ## Start frontend service
	@echo "🚀 Starting frontend service..."
	docker-compose up -d frontend
	@echo "✅ Frontend service started!"
	@echo "🌐 Frontend: http://localhost:3000"

start-db: ## Start database service
	@echo "🚀 Starting database service..."
	docker-compose up -d postgres
	@echo "✅ Database service started!"
	@echo "🗄️  PostgreSQL: localhost:5432"

stop: ## Stop all services
	@echo "🛑 Stopping all services..."
	docker-compose down
	@echo "✅ Services stopped!"

stop-be: ## Stop backend service
	@echo "🛑 Stopping backend service..."
	docker-compose stop backend
	@echo "✅ Backend service stopped!"

stop-fe: ## Stop frontend service
	@echo "🛑 Stopping frontend service..."
	docker-compose stop frontend
	@echo "✅ Frontend service stopped!"

stop-db: ## Stop database service
	@echo "🛑 Stopping database service..."
	docker-compose stop postgres
	@echo "✅ Database service stopped!"

restart: ## Restart all services
	@echo "🔄 Restarting services..."
	docker-compose restart
	@echo "✅ Services restarted!"

logs: ## Show logs from all services
	docker-compose logs -f

logs-be: ## Show backend logs
	docker-compose logs -f backend

logs-fe: ## Show frontend logs
	docker-compose logs -f frontend

logs-db: ## Show database logs
	docker-compose logs -f postgres

clean: ## Stop and remove all containers, networks, and volumes
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	@echo "✅ Cleanup complete!"

build: ## Build all Docker images
	@echo "🔨 Building Docker images..."
	docker-compose build
	@echo "✅ Build complete!"

rebuild: ## Rebuild and restart all services
	@echo "🔨 Rebuilding and restarting..."
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
	@echo "✅ Rebuild complete!"

rebuild-be: ## Rebuild and restart backend service
	@echo "🔨 Rebuilding and restarting backend..."
	docker-compose down backend
	docker-compose build --no-cache backend
	docker-compose up -d backend
	@echo "✅ Rebuild backend complete!"

rebuild-fe: ## Rebuild and restart frontend service
	@echo "🔨 Rebuilding and restarting frontend..."
	docker-compose down frontend
	docker-compose build --no-cache frontend
	docker-compose up -d frontend
	@echo "✅ Rebuild frontend complete!"

dev-be: ## Run backend in development mode
	cd backend && go run cmd/server/main.go

dev-fe: ## Run frontend in development mode
	cd frontend && npm run dev

dev-app: ## Run electron app in development mode
	cd electron && npm run dev

build-app: ## Build electron app
	cd electron && npm run build:all

build-swag: ## Generate Swagger documentation
	cd backend && swag init -g ./cmd/server/main.go -o ./docs --parseDependency --parseInternal --dir ./

install-be: ## Install backend dependencies
	cd backend && go mod download

install-fe: ## Install frontend dependencies
	cd frontend && npm install

install-app: ## Install electron dependencies
	cd electron && npm install

install-all: ## Install all dependencies
	@echo "📦 Installing all dependencies..."
	$(MAKE) install-backend
	$(MAKE) install-frontend
	$(MAKE) install-electron
	@echo "✅ All dependencies installed!"

test-be: ## Run backend tests
	cd backend && go test -v ./...

test-fe: ## Run frontend tests
	cd frontend && npm test

db-shell: ## Connect to PostgreSQL shell
	docker-compose exec postgres psql -U rtt_user -d remote_time_tracker

db-reset: ## Reset database (WARNING: This will delete all data)
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker-compose up -d postgres; \
		sleep 5; \
		docker-compose up -d backend; \
		echo "✅ Database reset complete!"; \
	fi

status: ## Show status of all services
	docker-compose ps

debug-be: ## Debug backend issues
	@echo "=== Container Status ==="
	@docker ps -a --filter "name=rtt-backend" --format "table {{.Names}}\t{{.Status}}"
	@echo ""
	@echo "=== Backend Logs (last 50 lines) ==="
	@docker logs rtt-backend --tail 50 2>&1 || echo "Container not found"
	@echo ""
	@echo "=== Database Check ==="
	@docker exec rtt-postgres psql -U rtt_user -d postgres -c "SELECT datname FROM pg_database;" 2>&1 || echo "Database not accessible"

health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@curl -s http://localhost:8080/health || echo "❌ Backend is down"
	@curl -s http://localhost:3000/health || echo "❌ Frontend is down"
	@docker-compose exec postgres pg_isready -U rtt_user || echo "❌ Database is down"

backup-db: ## Backup database
	@echo "💾 Backing up database..."
	@mkdir -p backups
	@docker-compose exec -T postgres pg_dump -U rtt_user remote_time_tracker | gzip > backups/backup_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "✅ Database backed up to backups/"

restore-db: ## Restore database from backup (usage: make restore-db FILE=backups/backup.sql.gz)
	@if [ -z "$(FILE)" ]; then \
		read -p "📁 Enter backup file path: " file_path; \
		echo "♻️  Restoring database from $$file_path..."; \
		gunzip -c $$file_path | docker-compose exec -T postgres psql -U rtt_user -d remote_time_tracker; \
	else \
		echo "♻️  Restoring database from $(FILE)..."; \
		gunzip -c $(FILE) | docker-compose exec -T postgres psql -U rtt_user -d remote_time_tracker; \
	fi
	@echo "✅ Database restored!"

prune: ## Remove all unused Docker resources
	@echo "🧹 Pruning Docker resources..."
	docker system prune -af
	@echo "✅ Prune complete!"
