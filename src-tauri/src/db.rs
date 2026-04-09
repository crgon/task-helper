use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::path::Path;

pub struct AppState {
    pub pool: SqlitePool,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
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

pub async fn init_db(database_path: &Path) -> Result<SqlitePool, sqlx::Error> {
    let options = SqliteConnectOptions::new()
        .filename(database_path)
        .create_if_missing(true);
    let pool = SqlitePoolOptions::new().connect_with(options).await?;

    sqlx::query(
        r#"
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
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id           INTEGER NOT NULL,
        title             TEXT    NOT NULL,
        suggested_due_at  TEXT,
        estimate_hours    REAL,
        note              TEXT,
        completed_at      TEXT,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS task_logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id    INTEGER NOT NULL,
        content    TEXT    NOT NULL,
        log_type   TEXT    NOT NULL DEFAULT 'note',
        created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS task_attachments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id     INTEGER NOT NULL,
        file_name   TEXT    NOT NULL,
        file_path   TEXT    NOT NULL,
        file_type   TEXT    NOT NULL DEFAULT 'file',
        file_size   INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );
        "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Subtask {
    pub id: i64,
    pub task_id: i64,
    pub title: String,
    pub suggested_due_at: Option<String>,
    pub estimate_hours: Option<f64>,
    pub note: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct NewSubtask {
    pub task_id: i64,
    pub title: String,
    pub suggested_due_at: Option<String>,
    pub estimate_hours: Option<f64>,
    pub note: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct TaskLog {
    pub id: i64,
    pub task_id: i64,
    pub content: String,
    pub log_type: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewTaskLog {
    pub task_id: i64,
    pub content: String,
    pub log_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct TaskAttachment {
    pub id: i64,
    pub task_id: i64,
    pub file_name: String,
    pub file_path: String,
    pub file_type: String,
    pub file_size: i64,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct NewAttachment {
    pub task_id: i64,
    pub file_name: String,
    pub file_path: String,
    pub file_type: String,
    pub file_size: i64,
}