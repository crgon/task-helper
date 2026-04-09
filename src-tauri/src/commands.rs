use tauri::State;
use crate::db::{AppState, NewTask, Task};

// ─── 查询所有未完成任务（按 due_at 升序）────────────────────────
#[tauri::command]
pub async fn get_tasks(state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let rows = sqlx::query_as::<_, Task>(
        r#"SELECT id, title, category, due_at, priority, note,
                  completed_at, created_at
           FROM tasks
           ORDER BY
             CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,
             due_at ASC,
             created_at DESC"#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(rows)
}

// ─── 添加任务 ────────────────────────────────────────────────────
#[tauri::command]
pub async fn add_task(state: State<'_, AppState>, task: NewTask) -> Result<i64, String> {
    let category = task.category.unwrap_or_else(|| "general".to_string());
    let priority = task.priority.unwrap_or(2);

    let result = sqlx::query(
        r#"INSERT INTO tasks (title, category, due_at, priority, note)
           VALUES (?1, ?2, ?3, ?4, ?5)"#,
    )
    .bind(task.title)
    .bind(category)
    .bind(task.due_at)
    .bind(priority)
    .bind(task.note)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.last_insert_rowid())
}

// ─── 标记完成 ────────────────────────────────────────────────────
#[tauri::command]
pub async fn complete_task(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    sqlx::query("UPDATE tasks SET completed_at = datetime('now','localtime') WHERE id = ?1")
    .bind(id)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── 删除任务 ────────────────────────────────────────────────────
#[tauri::command]
pub async fn delete_task(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    sqlx::query("DELETE FROM tasks WHERE id = ?1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── 批量插入子任务 ──────────────────────────────────────────────
#[tauri::command]
pub async fn add_subtasks(
    state: State<'_, AppState>,
    subtasks: Vec<crate::db::NewSubtask>,
) -> Result<(), String> {
    for s in subtasks {
        sqlx::query(
            r#"INSERT INTO subtasks (task_id, title, suggested_due_at, estimate_hours, note)
               VALUES (?1, ?2, ?3, ?4, ?5)"#,
        )
        .bind(s.task_id)
        .bind(s.title)
        .bind(s.suggested_due_at)
        .bind(s.estimate_hours)
        .bind(s.note)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─── 查询某任务的子任务 ───────────────────────────────────────────
#[tauri::command]
pub async fn get_subtasks(
    state: State<'_, AppState>,
    task_id: i64,
) -> Result<Vec<crate::db::Subtask>, String> {
    let rows = sqlx::query_as::<_, crate::db::Subtask>(
        "SELECT id, task_id, title, suggested_due_at, estimate_hours, note, completed_at
         FROM subtasks WHERE task_id = ?1 ORDER BY id ASC"
    )
    .bind(task_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(rows)
}

// ─── 完成子任务 ──────────────────────────────────────────────────
#[tauri::command]
pub async fn complete_subtask(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    sqlx::query("UPDATE subtasks SET completed_at = datetime('now','localtime') WHERE id = ?1")
    .bind(id)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn add_task_log(
    state: State<'_, AppState>,
    log: crate::db::NewTaskLog,
) -> Result<i64, String> {
    let result = sqlx::query("INSERT INTO task_logs (task_id, content, log_type) VALUES (?1, ?2, ?3)")
        .bind(log.task_id)
        .bind(log.content)
        .bind(log.log_type)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(result.last_insert_rowid())
}

#[tauri::command]
pub async fn get_task_logs(
    state: State<'_, AppState>,
    task_id: i64,
) -> Result<Vec<crate::db::TaskLog>, String> {
    let rows = sqlx::query_as::<_, crate::db::TaskLog>(
        "SELECT id, task_id, content, log_type, created_at
         FROM task_logs WHERE task_id = ?1 ORDER BY created_at DESC",
    )
    .bind(task_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub async fn delete_task_log(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    sqlx::query("DELETE FROM task_logs WHERE id = ?1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_task_by_id(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Option<Task>, String> {
    let row = sqlx::query_as::<_, Task>(
        "SELECT id, title, category, due_at, priority, note, completed_at, created_at
         FROM tasks WHERE id = ?1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(row)
}