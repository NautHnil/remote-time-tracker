import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { AppConfig } from "../config";

export interface TimeLog {
  id?: number;
  localId: string;
  taskId?: number; // Deprecated: Use taskLocalId instead
  taskLocalId?: string; // UUID - primary reference to task
  organizationId?: number; // Organization ID for workspace context
  workspaceId?: number; // Workspace ID the time log belongs to
  userId?: number; // User ID who owns this time log
  startTime: string;
  endTime?: string;
  pausedAt?: string;
  resumedAt?: string;
  duration: number;
  pausedTotal: number;
  status: "running" | "paused" | "stopped";
  taskTitle?: string;
  notes?: string;
  isSynced: boolean;
  createdAt: string;
}

export interface Screenshot {
  id?: number;
  localId: string;
  timeLogId?: number;
  taskId?: number; // Deprecated: Use taskLocalId instead
  taskLocalId?: string; // UUID - primary reference to task
  organizationId?: number; // Organization ID for workspace context
  workspaceId?: number; // Workspace ID the screenshot belongs to
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  capturedAt: string;
  screenNumber: number;
  isEncrypted?: boolean;
  checksum?: string;
  isSynced: boolean;
  createdAt: string;
}

export class DatabaseService {
  private db: Database.Database | null = null;

  async initialize(): Promise<void> {
    const dbPath = AppConfig.getDatabasePath();
    const dbDir = path.dirname(dbPath);

    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");

    await this.createTables();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // Time logs table
    // Note: task_title field added in migration (see migrations/add_task_title.ts)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS time_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_id TEXT UNIQUE NOT NULL,
        task_id INTEGER,
        task_local_id TEXT,
        organization_id INTEGER,
        workspace_id INTEGER,
        user_id INTEGER,
        start_time TEXT NOT NULL,
        end_time TEXT,
        paused_at TEXT,
        resumed_at TEXT,
        duration INTEGER DEFAULT 0,
        paused_total INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        task_title TEXT,
        notes TEXT,
        is_synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);

    // Screenshots table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS screenshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_id TEXT UNIQUE NOT NULL,
        time_log_id INTEGER,
        task_id INTEGER,
        task_local_id TEXT,
        organization_id INTEGER,
        workspace_id INTEGER,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT DEFAULT 'image/png',
        captured_at TEXT NOT NULL,
        screen_number INTEGER DEFAULT 0,
        is_encrypted INTEGER DEFAULT 0,
        checksum TEXT,
        is_synced INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (time_log_id) REFERENCES time_logs(id)
      )
    `);

    // Sync queue table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // Run migrations for existing tables
    await this.runMigrations();

    console.log("✅ Database tables created/verified");
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      // Get existing columns in screenshots table
      const tableInfo = this.db
        .prepare("PRAGMA table_info(screenshots)")
        .all() as Array<{ name: string }>;

      const existingColumns = new Set(tableInfo.map((col) => col.name));

      // Add mime_type column if missing
      if (!existingColumns.has("mime_type")) {
        console.log(
          "🔄 Running migration: Adding mime_type column to screenshots",
        );
        this.db.exec(`
          ALTER TABLE screenshots ADD COLUMN mime_type TEXT DEFAULT 'image/png'
        `);
        console.log("✅ Migration completed: mime_type column added");
      }

      // Add is_encrypted column if missing
      if (!existingColumns.has("is_encrypted")) {
        console.log(
          "🔄 Running migration: Adding is_encrypted column to screenshots",
        );
        this.db.exec(`
          ALTER TABLE screenshots ADD COLUMN is_encrypted INTEGER DEFAULT 0
        `);
        console.log("✅ Migration completed: is_encrypted column added");
      }

      // Add checksum column if missing
      if (!existingColumns.has("checksum")) {
        console.log(
          "🔄 Running migration: Adding checksum column to screenshots",
        );
        this.db.exec(`
          ALTER TABLE screenshots ADD COLUMN checksum TEXT
        `);
        console.log("✅ Migration completed: checksum column added");
      }

      // Check and add task_title column to time_logs table if missing
      const timeLogsInfo = this.db
        .prepare("PRAGMA table_info(time_logs)")
        .all() as Array<{ name: string }>;

      const timeLogsColumns = new Set(timeLogsInfo.map((col) => col.name));

      if (!timeLogsColumns.has("task_title")) {
        console.log(
          "🔄 Running migration: Adding task_title column to time_logs",
        );
        this.db.exec(`
          ALTER TABLE time_logs ADD COLUMN task_title TEXT
        `);
        console.log("✅ Migration completed: task_title column added");
      }

      // Add task_local_id column if missing
      if (!timeLogsColumns.has("task_local_id")) {
        console.log(
          "🔄 Running migration: Adding task_local_id column to time_logs",
        );
        this.db.exec(`
          ALTER TABLE time_logs ADD COLUMN task_local_id TEXT
        `);
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_time_logs_task_local_id ON time_logs(task_local_id)
        `);
        console.log("✅ Migration completed: task_local_id column added");
      }

      // Add task_local_id column to screenshots if missing
      if (!existingColumns.has("task_local_id")) {
        console.log(
          "🔄 Running migration: Adding task_local_id column to screenshots",
        );
        this.db.exec(`
          ALTER TABLE screenshots ADD COLUMN task_local_id TEXT
        `);
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_screenshots_task_local_id ON screenshots(task_local_id)
        `);
        console.log(
          "✅ Migration completed: task_local_id column added to screenshots",
        );
      }

      // Ensure indexes exist (for both new and existing databases)
      console.log("🔄 Ensuring indexes exist...");
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_time_logs_task_local_id ON time_logs(task_local_id)
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_screenshots_task_local_id ON screenshots(task_local_id)
      `);
      console.log("✅ Indexes verified");

      // Add organization_id, workspace_id, and user_id columns to time_logs if missing
      if (!timeLogsColumns.has("organization_id")) {
        console.log(
          "🔄 Running migration: Adding organization_id column to time_logs",
        );
        this.db.exec(`
          ALTER TABLE time_logs ADD COLUMN organization_id INTEGER
        `);
        console.log(
          "✅ Migration completed: organization_id column added to time_logs",
        );
      }

      if (!timeLogsColumns.has("workspace_id")) {
        console.log(
          "🔄 Running migration: Adding workspace_id column to time_logs",
        );
        this.db.exec(`
          ALTER TABLE time_logs ADD COLUMN workspace_id INTEGER
        `);
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_time_logs_workspace_id ON time_logs(workspace_id)
        `);
        console.log(
          "✅ Migration completed: workspace_id column added to time_logs",
        );
      }

      if (!timeLogsColumns.has("user_id")) {
        console.log("🔄 Running migration: Adding user_id column to time_logs");
        this.db.exec(`
          ALTER TABLE time_logs ADD COLUMN user_id INTEGER
        `);
        console.log(
          "✅ Migration completed: user_id column added to time_logs",
        );
      }

      // Add organization_id and workspace_id columns to screenshots if missing
      if (!existingColumns.has("organization_id")) {
        console.log(
          "🔄 Running migration: Adding organization_id column to screenshots",
        );
        this.db.exec(`
          ALTER TABLE screenshots ADD COLUMN organization_id INTEGER
        `);
        console.log(
          "✅ Migration completed: organization_id column added to screenshots",
        );
      }

      if (!existingColumns.has("workspace_id")) {
        console.log(
          "🔄 Running migration: Adding workspace_id column to screenshots",
        );
        this.db.exec(`
          ALTER TABLE screenshots ADD COLUMN workspace_id INTEGER
        `);
        this.db.exec(`
          CREATE INDEX IF NOT EXISTS idx_screenshots_workspace_id ON screenshots(workspace_id)
        `);
        console.log(
          "✅ Migration completed: workspace_id column added to screenshots",
        );
      }

      // Ensure workspace indexes exist
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_time_logs_workspace_id ON time_logs(workspace_id)
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_screenshots_workspace_id ON screenshots(workspace_id)
      `);
    } catch (error) {
      console.error("Migration error:", error);
      // Don't throw - allow app to continue if migration fails
    }
  }

  // Time Logs methods
  async createTimeLog(timeLog: Omit<TimeLog, "id">): Promise<TimeLog> {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      INSERT INTO time_logs (
        local_id, task_id, task_local_id, organization_id, workspace_id, user_id,
        start_time, end_time, paused_at, resumed_at,
        duration, paused_total, status, task_title, notes, is_synced, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      timeLog.localId,
      timeLog.taskId ?? null,
      timeLog.taskLocalId ?? null,
      timeLog.organizationId ?? null,
      timeLog.workspaceId ?? null,
      timeLog.userId ?? null,
      timeLog.startTime,
      timeLog.endTime,
      timeLog.pausedAt,
      timeLog.resumedAt,
      timeLog.duration,
      timeLog.pausedTotal,
      timeLog.status,
      timeLog.taskTitle || null,
      timeLog.notes,
      timeLog.isSynced ? 1 : 0,
      timeLog.createdAt,
    );

    return { ...timeLog, id: result.lastInsertRowid as number };
  }

  async updateTimeLog(id: number, updates: Partial<TimeLog>): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const fields = Object.keys(updates)
      .filter((key) => key !== "id")
      .map((key) => `${this.camelToSnake(key)} = ?`)
      .join(", ");

    const values = Object.entries(updates)
      .filter(([key]) => key !== "id")
      .map(([key, value]) => {
        if (key === "isSynced") return value ? 1 : 0;
        return value;
      });

    const stmt = this.db.prepare(`UPDATE time_logs SET ${fields} WHERE id = ?`);
    stmt.run(...values, id);
  }

  async getAllTimeLogs(): Promise<TimeLog[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = this.db
      .prepare("SELECT * FROM time_logs ORDER BY start_time DESC")
      .all();
    return rows.map(this.rowToTimeLog);
  }

  async getTimeLogById(id: number): Promise<TimeLog | null> {
    if (!this.db) throw new Error("Database not initialized");

    const row = this.db.prepare("SELECT * FROM time_logs WHERE id = ?").get(id);

    return row ? this.rowToTimeLog(row) : null;
  }

  async getActiveTimeLog(): Promise<TimeLog | null> {
    if (!this.db) throw new Error("Database not initialized");

    const row = this.db
      .prepare(
        "SELECT * FROM time_logs WHERE status IN ('running', 'paused') ORDER BY start_time DESC LIMIT 1",
      )
      .get();

    return row ? this.rowToTimeLog(row) : null;
  }

  async getUnsyncedTimeLogs(): Promise<TimeLog[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = this.db
      .prepare("SELECT * FROM time_logs WHERE is_synced = 0")
      .all();
    return rows.map(this.rowToTimeLog);
  }

  async getTimeLogsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<TimeLog[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = this.db
      .prepare(
        "SELECT * FROM time_logs WHERE start_time >= ? AND start_time <= ? ORDER BY start_time DESC",
      )
      .all(startDate, endDate);

    return rows.map(this.rowToTimeLog);
  }

  async getTodayTotalDuration(userId: number): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    // Get today's date range (00:00:00 to 23:59:59)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.toISOString();

    today.setHours(23, 59, 59, 999);
    const endOfDay = today.toISOString();

    // Sum durations for completed sessions today
    // duration is already stored as net working time (pause excluded)
    const result = this.db
      .prepare(
        `
        SELECT SUM(COALESCE(duration, 0)) as total
        FROM time_logs
        WHERE start_time >= ? AND start_time <= ?
          AND status = 'stopped' AND user_id = ?
      `,
      )
      .get(startOfDay, endOfDay, userId) as { total: number | null };

    return Math.max(0, Math.floor(result?.total || 0));
  }

  // Screenshots methods
  async createScreenshot(
    screenshot: Omit<Screenshot, "id">,
  ): Promise<Screenshot> {
    if (!this.db) throw new Error("Database not initialized");

    const stmt = this.db.prepare(`
      INSERT INTO screenshots (
        local_id, time_log_id, task_id, task_local_id, organization_id, workspace_id,
        file_path, file_name, file_size,
        mime_type, captured_at, screen_number, is_encrypted, checksum, is_synced, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      screenshot.localId,
      screenshot.timeLogId ?? null,
      screenshot.taskId ?? null,
      screenshot.taskLocalId ?? null,
      screenshot.organizationId ?? null,
      screenshot.workspaceId ?? null,
      screenshot.filePath,
      screenshot.fileName,
      screenshot.fileSize,
      screenshot.mimeType ?? "image/png",
      screenshot.capturedAt,
      screenshot.screenNumber ?? 0,
      screenshot.isEncrypted ? 1 : 0,
      screenshot.checksum ?? null,
      screenshot.isSynced ? 1 : 0,
      screenshot.createdAt,
    );

    return { ...screenshot, id: result.lastInsertRowid as number };
  }

  async getAllScreenshots(): Promise<Screenshot[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = this.db
      .prepare("SELECT * FROM screenshots ORDER BY captured_at DESC")
      .all();
    return rows.map(this.rowToScreenshot);
  }

  async getScreenshotsByTimeLog(timeLogId: number): Promise<Screenshot[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = this.db
      .prepare(
        "SELECT * FROM screenshots WHERE time_log_id = ? ORDER BY captured_at ASC",
      )
      .all(timeLogId);

    return rows.map(this.rowToScreenshot);
  }

  async getUnsyncedScreenshots(): Promise<Screenshot[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = this.db
      .prepare("SELECT * FROM screenshots WHERE is_synced = 0")
      .all();
    return rows.map(this.rowToScreenshot);
  }

  async getScreenshots(options?: {
    date?: string;
    limit?: number;
    includeUnsynced?: boolean; // Default: only show unsynced
  }): Promise<Screenshot[]> {
    if (!this.db) throw new Error("Database not initialized");

    let query = "SELECT * FROM screenshots";
    const params: any[] = [];
    const conditions: string[] = [];

    // By default, only show unsynced screenshots (local only)
    // This prevents showing duplicates that are already on server
    if (options?.includeUnsynced !== false) {
      conditions.push("is_synced = 0");
    }

    if (options?.date) {
      conditions.push("DATE(captured_at) = DATE(?)");
      params.push(options.date);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY captured_at DESC";

    if (options?.limit) {
      query += " LIMIT ?";
      params.push(options.limit);
    }

    const rows = this.db.prepare(query).all(...params);
    return rows.map(this.rowToScreenshot);
  }

  async deleteScreenshot(id: number): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // Get file path before deleting from database
    const screenshot = this.db
      .prepare("SELECT file_path FROM screenshots WHERE id = ?")
      .get(id) as { file_path: string } | undefined;

    if (screenshot?.file_path) {
      // Delete file from filesystem
      try {
        if (fs.existsSync(screenshot.file_path)) {
          fs.unlinkSync(screenshot.file_path);
        }
      } catch (error) {
        console.error("Failed to delete screenshot file:", error);
      }
    }

    // Delete from database
    this.db.prepare("DELETE FROM screenshots WHERE id = ?").run(id);
  }

  async markTimeLogAsSynced(localId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    this.db
      .prepare("UPDATE time_logs SET is_synced = 1 WHERE local_id = ?")
      .run(localId);
  }

  async markScreenshotAsSynced(localId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    this.db
      .prepare("UPDATE screenshots SET is_synced = 1 WHERE local_id = ?")
      .run(localId);
  }

  async getScreenshotByFilePath(filePath: string): Promise<Screenshot | null> {
    if (!this.db) throw new Error("Database not initialized");

    const row = this.db
      .prepare("SELECT * FROM screenshots WHERE file_path = ?")
      .get(filePath);

    return row ? this.rowToScreenshot(row) : null;
  }

  async deleteScreenshotByFilePath(filePath: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    this.db
      .prepare("DELETE FROM screenshots WHERE file_path = ?")
      .run(filePath);
  }

  async getSyncedScreenshotsBeforeDate(date: string): Promise<Screenshot[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = this.db
      .prepare(
        "SELECT * FROM screenshots WHERE is_synced = 1 AND captured_at < ? ORDER BY captured_at ASC",
      )
      .all(date);

    return rows.map(this.rowToScreenshot);
  }

  async getScreenshotsByTaskId(taskId: number): Promise<Screenshot[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = this.db
      .prepare(
        "SELECT * FROM screenshots WHERE task_id = ? ORDER BY captured_at ASC",
      )
      .all(taskId);

    return rows.map(this.rowToScreenshot);
  }

  // Task-related methods (queries against synced backend data)
  // Note: These methods query time_logs table to get task statistics
  async getTaskStats(taskId: number): Promise<{
    totalDuration: number;
    screenshotCount: number;
    sessionCount: number;
  }> {
    if (!this.db) throw new Error("Database not initialized");

    // Get total duration from time logs
    const durationRow = this.db
      .prepare("SELECT SUM(duration) as total FROM time_logs WHERE task_id = ?")
      .get(taskId) as { total: number | null };

    // Get screenshot count
    const screenshotRow = this.db
      .prepare("SELECT COUNT(*) as count FROM screenshots WHERE task_id = ?")
      .get(taskId) as { count: number };

    // Get session count
    const sessionRow = this.db
      .prepare("SELECT COUNT(*) as count FROM time_logs WHERE task_id = ?")
      .get(taskId) as { count: number };

    return {
      totalDuration: durationRow.total || 0,
      screenshotCount: screenshotRow.count,
      sessionCount: sessionRow.count,
    };
  }

  // Helper methods
  private rowToTimeLog(row: any): TimeLog {
    return {
      id: row.id,
      localId: row.local_id,
      taskId: row.task_id,
      taskLocalId: row.task_local_id,
      organizationId: row.organization_id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      startTime: row.start_time,
      endTime: row.end_time,
      pausedAt: row.paused_at,
      resumedAt: row.resumed_at,
      duration: row.duration,
      pausedTotal: row.paused_total,
      status: row.status,
      taskTitle: row.task_title,
      notes: row.notes,
      isSynced: row.is_synced === 1,
      createdAt: row.created_at,
    };
  }

  private rowToScreenshot(row: any): Screenshot {
    return {
      id: row.id,
      localId: row.local_id,
      timeLogId: row.time_log_id,
      taskId: row.task_id,
      taskLocalId: row.task_local_id,
      organizationId: row.organization_id,
      workspaceId: row.workspace_id,
      filePath: row.file_path,
      fileName: row.file_name,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      capturedAt: row.captured_at,
      screenNumber: row.screen_number,
      isEncrypted: row.is_encrypted === 1,
      checksum: row.checksum,
      isSynced: row.is_synced === 1,
      createdAt: row.created_at,
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
