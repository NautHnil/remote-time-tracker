/**
 * Migration Script for Electron SQLite Database
 * Adds task_title column to time_logs table
 */

import Database from "better-sqlite3";
import { app } from "electron";
import fs from "fs";
import path from "path";

export function migrateDatabase() {
  const userDataPath = app.getPath("userData");
  const dbPath = path.join(userDataPath, "time-tracker.db");

  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.log("⏭️  No existing database found, skipping migration");
    return;
  }

  console.log("🔄 Running database migration...");
  const db = new Database(dbPath);

  try {
    // Check if task_title column exists
    const tableInfo = db
      .prepare(
        "SELECT name FROM pragma_table_info('time_logs') WHERE name='task_title'"
      )
      .all();

    if (tableInfo.length === 0) {
      console.log("➕ Adding task_title column to time_logs table...");

      // SQLite doesn't support IF NOT EXISTS for ALTER TABLE
      // So we check first, then add
      db.exec(`
        ALTER TABLE time_logs ADD COLUMN task_title TEXT;
      `);

      console.log("✅ Migration completed successfully");
    } else {
      console.log("⏭️  task_title column already exists, skipping migration");
    }

    // Verify the column was added
    const verifyInfo = db
      .prepare(
        "SELECT name FROM pragma_table_info('time_logs') WHERE name='task_title'"
      )
      .all();

    if (verifyInfo.length > 0) {
      console.log("✅ Verified: task_title column exists in time_logs table");
    } else {
      console.error("❌ Migration failed: task_title column not found");
    }
  } catch (error) {
    console.error("❌ Migration error:", error);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  try {
    migrateDatabase();
    console.log("🎉 Database migration completed!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}
