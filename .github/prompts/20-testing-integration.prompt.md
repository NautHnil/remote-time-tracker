# TODO 20: Testing và Integration

## Mục tiêu

Tạo hướng dẫn testing và integration cho admin web interface.

## Yêu cầu

### 1. Unit Tests

- Test backend API endpoints
- Test frontend components
- Test React hooks
- Test utility functions

### 2. Integration Tests

- Test API with database
- Test frontend with API
- Test complete flows

### 3. E2E Tests

- Test admin login flow
- Test CRUD operations
- Test navigation
- Test export functions

## Testing Stack

```
Backend:
- Go testing package
- testify/assert
- httptest
- sqlmock

Frontend:
- Jest
- React Testing Library
- MSW (Mock Service Worker)
- Cypress (E2E)
```

## Tasks chi tiết

### Task 20.1: Backend Unit Tests

```go
// backend/internal/controller/admin_controller_test.go
package controller

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

// Mock Repository
type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) FindAll(params dto.AdminUserListParams) ([]models.User, int64, error) {
    args := m.Called(params)
    return args.Get(0).([]models.User), args.Get(1).(int64), args.Error(2)
}

func TestAdminController_ListUsers(t *testing.T) {
    gin.SetMode(gin.TestMode)

    tests := []struct {
        name           string
        setupMock      func(*MockUserRepository)
        expectedStatus int
        expectedBody   map[string]interface{}
    }{
        {
            name: "success - returns users list",
            setupMock: func(m *MockUserRepository) {
                m.On("FindAll", mock.Anything).Return(
                    []models.User{
                        {ID: 1, Email: "test@example.com"},
                    },
                    int64(1),
                    nil,
                )
            },
            expectedStatus: http.StatusOK,
            expectedBody: map[string]interface{}{
                "success": true,
            },
        },
        {
            name: "error - repository error",
            setupMock: func(m *MockUserRepository) {
                m.On("FindAll", mock.Anything).Return(
                    []models.User{},
                    int64(0),
                    errors.New("database error"),
                )
            },
            expectedStatus: http.StatusInternalServerError,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            mockRepo := new(MockUserRepository)
            tt.setupMock(mockRepo)

            controller := NewAdminController(mockRepo)

            w := httptest.NewRecorder()
            c, _ := gin.CreateTestContext(w)
            c.Request = httptest.NewRequest("GET", "/api/v1/admin/users", nil)

            // Set admin user context
            c.Set("user", &models.User{ID: 1, SystemRole: "admin"})

            controller.ListUsers(c)

            assert.Equal(t, tt.expectedStatus, w.Code)

            if tt.expectedBody != nil {
                var response map[string]interface{}
                json.Unmarshal(w.Body.Bytes(), &response)
                assert.Equal(t, tt.expectedBody["success"], response["success"])
            }
        })
    }
}

func TestAdminController_GetOverviewStats(t *testing.T) {
    gin.SetMode(gin.TestMode)

    t.Run("success - returns overview statistics", func(t *testing.T) {
        mockService := new(MockAdminService)
        mockService.On("GetOverviewStats").Return(&dto.OverviewStats{
            TotalUsers:         100,
            ActiveUsers:        80,
            TotalOrganizations: 10,
        }, nil)

        controller := NewAdminController(nil, mockService)

        w := httptest.NewRecorder()
        c, _ := gin.CreateTestContext(w)
        c.Request = httptest.NewRequest("GET", "/api/v1/admin/statistics/overview", nil)
        c.Set("user", &models.User{ID: 1, SystemRole: "admin"})

        controller.GetOverviewStats(c)

        assert.Equal(t, http.StatusOK, w.Code)

        var response dto.ApiResponse
        json.Unmarshal(w.Body.Bytes(), &response)
        assert.True(t, response.Success)
    })
}
```

### Task 20.2: Backend Integration Tests

```go
// backend/internal/integration/admin_integration_test.go
package integration

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/suite"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
)

type AdminIntegrationSuite struct {
    suite.Suite
    db     *gorm.DB
    router *gin.Engine
    token  string
}

func (s *AdminIntegrationSuite) SetupSuite() {
    // Setup in-memory SQLite database
    db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
    s.Require().NoError(err)

    // Run migrations
    db.AutoMigrate(&models.User{}, &models.Organization{}, &models.Task{})

    s.db = db
    s.router = setupRouter(db)

    // Create admin user and get token
    adminUser := &models.User{
        Email:      "admin@test.com",
        Password:   hashPassword("password"),
        SystemRole: "admin",
    }
    db.Create(adminUser)

    s.token = generateToken(adminUser)
}

func (s *AdminIntegrationSuite) TearDownSuite() {
    sqlDB, _ := s.db.DB()
    sqlDB.Close()
}

func (s *AdminIntegrationSuite) TestListUsers() {
    // Create test users
    for i := 0; i < 5; i++ {
        s.db.Create(&models.User{
            Email: fmt.Sprintf("user%d@test.com", i),
        })
    }

    req := httptest.NewRequest("GET", "/api/v1/admin/users?page=1&page_size=10", nil)
    req.Header.Set("Authorization", "Bearer "+s.token)

    w := httptest.NewRecorder()
    s.router.ServeHTTP(w, req)

    s.Assert().Equal(http.StatusOK, w.Code)

    var response map[string]interface{}
    json.Unmarshal(w.Body.Bytes(), &response)

    data := response["data"].(map[string]interface{})
    s.Assert().Equal(float64(6), data["total"]) // 5 + 1 admin
}

func (s *AdminIntegrationSuite) TestCreateUser() {
    payload := map[string]interface{}{
        "email":       "newuser@test.com",
        "password":    "password123",
        "first_name":  "New",
        "last_name":   "User",
        "system_role": "user",
    }

    body, _ := json.Marshal(payload)
    req := httptest.NewRequest("POST", "/api/v1/admin/users", bytes.NewReader(body))
    req.Header.Set("Authorization", "Bearer "+s.token)
    req.Header.Set("Content-Type", "application/json")

    w := httptest.NewRecorder()
    s.router.ServeHTTP(w, req)

    s.Assert().Equal(http.StatusCreated, w.Code)

    // Verify user was created
    var user models.User
    s.db.Where("email = ?", "newuser@test.com").First(&user)
    s.Assert().NotZero(user.ID)
}

func (s *AdminIntegrationSuite) TestDeleteUser() {
    // Create user to delete
    user := &models.User{Email: "todelete@test.com"}
    s.db.Create(user)

    req := httptest.NewRequest("DELETE", fmt.Sprintf("/api/v1/admin/users/%d", user.ID), nil)
    req.Header.Set("Authorization", "Bearer "+s.token)

    w := httptest.NewRecorder()
    s.router.ServeHTTP(w, req)

    s.Assert().Equal(http.StatusOK, w.Code)

    // Verify user was soft deleted
    var deletedUser models.User
    result := s.db.Unscoped().Where("id = ?", user.ID).First(&deletedUser)
    s.Assert().NoError(result.Error)
    s.Assert().NotNil(deletedUser.DeletedAt)
}

func TestAdminIntegrationSuite(t *testing.T) {
    suite.Run(t, new(AdminIntegrationSuite))
}
```

### Task 20.3: Frontend Component Tests

```tsx
// frontend/src/components/admin/__tests__/UserTable.test.tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UserTable from "../users/UserTable";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const mockUsers = [
  {
    id: 1,
    email: "user1@test.com",
    first_name: "John",
    last_name: "Doe",
    role: "member",
    system_role: "user",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    email: "admin@test.com",
    first_name: "Admin",
    last_name: "User",
    role: "admin",
    system_role: "admin",
    is_active: true,
    created_at: "2024-01-02T00:00:00Z",
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe("UserTable", () => {
  const mockOnSort = jest.fn();
  const mockOnView = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user list correctly", () => {
    renderWithProviders(
      <UserTable
        users={mockUsers}
        isLoading={false}
        sortBy="created_at"
        sortOrder="desc"
        onSort={mockOnSort}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText("user1@test.com")).toBeInTheDocument();
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    renderWithProviders(
      <UserTable
        users={[]}
        isLoading={true}
        sortBy="created_at"
        sortOrder="desc"
        onSort={mockOnSort}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows empty state when no users", () => {
    renderWithProviders(
      <UserTable
        users={[]}
        isLoading={false}
        sortBy="created_at"
        sortOrder="desc"
        onSort={mockOnSort}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText("No users found")).toBeInTheDocument();
  });

  it("calls onSort when clicking sortable column", () => {
    renderWithProviders(
      <UserTable
        users={mockUsers}
        isLoading={false}
        sortBy="created_at"
        sortOrder="desc"
        onSort={mockOnSort}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    fireEvent.click(screen.getByText("Email"));
    expect(mockOnSort).toHaveBeenCalledWith("email");
  });

  it("calls onView when clicking view button", () => {
    renderWithProviders(
      <UserTable
        users={mockUsers}
        isLoading={false}
        sortBy="created_at"
        sortOrder="desc"
        onSort={mockOnSort}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    const viewButtons = screen.getAllByTitle("View details");
    fireEvent.click(viewButtons[0]);
    expect(mockOnView).toHaveBeenCalledWith(mockUsers[0]);
  });

  it("displays correct role badges", () => {
    renderWithProviders(
      <UserTable
        users={mockUsers}
        isLoading={false}
        sortBy="created_at"
        sortOrder="desc"
        onSort={mockOnSort}
        onView={mockOnView}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText("member")).toHaveClass("bg-blue-100");
    expect(screen.getByText("admin")).toHaveClass("bg-purple-100");
  });
});
```

### Task 20.4: Frontend Hook Tests

```tsx
// frontend/src/hooks/__tests__/useAdminAuth.test.tsx
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAdminAuth } from "../useAdminAuth";
import { useAuthStore } from "../../store/authStore";

// Mock the auth store
jest.mock("../../store/authStore");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe("useAdminAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns isAdmin true for admin users", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 1, system_role: "admin" },
      isAuthenticated: true,
      isLoading: false,
    });

    const { result } = renderHook(() => useAdminAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("redirects to login when not authenticated", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    renderHook(() => useAdminAuth(), { wrapper });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("redirects to home when not admin", async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 1, system_role: "user" },
      isAuthenticated: true,
      isLoading: false,
    });

    renderHook(() => useAdminAuth(), { wrapper });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});
```

### Task 20.5: E2E Tests với Cypress

```typescript
// frontend/cypress/e2e/admin/users.cy.ts
describe("Admin Users Management", () => {
  beforeEach(() => {
    // Login as admin
    cy.login("admin@test.com", "password123");
    cy.visit("/admin/users");
  });

  it("displays users list", () => {
    cy.get('[data-testid="user-table"]').should("be.visible");
    cy.get('[data-testid="user-row"]').should("have.length.greaterThan", 0);
  });

  it("can search users", () => {
    cy.get('[data-testid="search-input"]').type("john");
    cy.wait(500); // Debounce
    cy.get('[data-testid="user-row"]').each(($row) => {
      cy.wrap($row).should("contain.text", "john");
    });
  });

  it("can filter by role", () => {
    cy.get('[data-testid="role-filter"]').select("admin");
    cy.get('[data-testid="user-row"]').each(($row) => {
      cy.wrap($row)
        .find('[data-testid="role-badge"]')
        .should("contain.text", "admin");
    });
  });

  it("can create new user", () => {
    cy.get('[data-testid="add-user-btn"]').click();
    cy.get('[data-testid="create-user-modal"]').should("be.visible");

    cy.get('[name="email"]').type("newuser@test.com");
    cy.get('[name="password"]').type("password123");
    cy.get('[name="first_name"]').type("New");
    cy.get('[name="last_name"]').type("User");
    cy.get('[name="system_role"]').select("user");

    cy.get('[data-testid="submit-btn"]').click();

    cy.get('[data-testid="toast-success"]').should(
      "contain.text",
      "User created",
    );
    cy.get('[data-testid="user-table"]').should(
      "contain.text",
      "newuser@test.com",
    );
  });

  it("can edit user", () => {
    cy.get('[data-testid="user-row"]')
      .first()
      .find('[data-testid="edit-btn"]')
      .click();
    cy.get('[data-testid="edit-user-modal"]').should("be.visible");

    cy.get('[name="first_name"]').clear().type("Updated");
    cy.get('[data-testid="save-btn"]').click();

    cy.get('[data-testid="toast-success"]').should(
      "contain.text",
      "User updated",
    );
  });

  it("can delete user with confirmation", () => {
    cy.get('[data-testid="user-row"]')
      .last()
      .find('[data-testid="delete-btn"]')
      .click();
    cy.get('[data-testid="confirm-dialog"]').should("be.visible");

    cy.get('[data-testid="confirm-btn"]').click();

    cy.get('[data-testid="toast-success"]').should(
      "contain.text",
      "User deleted",
    );
  });

  it("pagination works correctly", () => {
    cy.get('[data-testid="page-size-select"]').select("10");
    cy.get('[data-testid="user-row"]').should("have.length.lte", 10);

    cy.get('[data-testid="next-page-btn"]').click();
    cy.url().should("include", "page=2");
  });
});

// frontend/cypress/e2e/admin/statistics.cy.ts
describe("Admin Statistics", () => {
  beforeEach(() => {
    cy.login("admin@test.com", "password123");
    cy.visit("/admin/statistics");
  });

  it("displays overview stats", () => {
    cy.get('[data-testid="stats-card"]').should("have.length", 4);
    cy.get('[data-testid="total-users"]').should("be.visible");
    cy.get('[data-testid="total-orgs"]').should("be.visible");
  });

  it("charts are rendered", () => {
    cy.get('[data-testid="user-growth-chart"]').should("be.visible");
    cy.get('[data-testid="activity-trend-chart"]').should("be.visible");
  });

  it("date range picker works", () => {
    cy.get('[data-testid="date-range-picker"]').click();
    cy.get('[data-testid="range-option-week"]').click();
    cy.get('[data-testid="date-range-picker"]').should(
      "contain.text",
      "Last 7 days",
    );
  });

  it("can export reports", () => {
    cy.get('[data-testid="export-users-btn"]').click();
    // Check that download started
    cy.readFile("cypress/downloads/users-report.csv").should("exist");
  });
});

// frontend/cypress/support/commands.ts
Cypress.Commands.add("login", (email: string, password: string) => {
  cy.request("POST", "/api/v1/auth/login", { email, password })
    .its("body")
    .then((response) => {
      window.localStorage.setItem("token", response.data.token);
    });
});
```

### Task 20.6: Test Configuration Files

```javascript
// frontend/jest.config.js
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/main.tsx"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

// frontend/src/setupTests.ts
import "@testing-library/jest-dom";
import { server } from "./mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// frontend/cypress.config.ts
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    video: false,
    screenshotOnRunFailure: true,
  },
  env: {
    apiUrl: "http://localhost:8080",
  },
});
```

## Test Commands

```bash
# Backend tests
cd backend
go test ./... -v
go test ./... -cover
go test -race ./...

# Frontend unit tests
cd frontend
npm run test
npm run test:coverage

# Frontend E2E tests
npm run cypress:open
npm run cypress:run

# Full test suite
make test-all
```

## Acceptance Criteria

- [ ] Backend unit tests coverage > 70%
- [ ] Frontend component tests cho major components
- [ ] Integration tests cho critical flows
- [ ] E2E tests cho admin CRUD operations
- [ ] CI/CD pipeline integration
- [ ] Test reports generated

## Dependencies

- Tất cả TODO trước đó

## Estimated Time

- 6-8 giờ

## Notes

- Sử dụng test fixtures và factories
- Mock external services
- Run tests in CI/CD pipeline
- Generate coverage reports
