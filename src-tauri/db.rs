use serde::{Deserialize, Serialize};
use tauri_plugin_sql::{Migration, MigrationKind};

// ─── 数据结构 ────────────────────────────────────────────────────
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub category: String,
    pub due_at: Option<String>,
    pub priority: i64,
    pub note: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewTask {
    pub title: String,
    pub category: Option<String>,
    pub due_at: Option<String>,
    pub priority: Option<i64>,
    pub note: Option<String>,
}

// ─── Migration（建表 SQL）────────────────────────────────────────
pub fn get_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: "
            CREATE TABLE IF NOT EXISTS tasks (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                title        TEXT    NOT NULL,
                category     TEXT    NOT NULL DEFAULT 'general',
                due_at       TEXT,
                priority     INTEGER NOT NULL DEFAULT 2,
                note         TEXT,
                completed_at TEXT,
                created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS subtasks (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id      INTEGER NOT NULL,
                title        TEXT    NOT NULL,
                completed_at TEXT,
                FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );
        ",
        kind: MigrationKind::Up,
    }]
}