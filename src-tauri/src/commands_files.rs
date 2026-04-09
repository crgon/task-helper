use crate::db::{AppState, TaskAttachment};
use std::fs;
use std::path::PathBuf;
use tauri::State;
use uuid::Uuid;

fn attachments_dir() -> PathBuf {
    let mut path = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("task-helper");
    path.push("attachments");
    let _ = fs::create_dir_all(&path);
    path
}

fn detect_file_type(name: &str) -> &'static str {
    let ext = name.rsplit('.').next().unwrap_or("").to_lowercase();
    match ext.as_str() {
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "svg" => "image",
        "pdf" => "pdf",
        _ => "file",
    }
}

#[tauri::command]
pub async fn save_attachment(
    state: State<'_, AppState>,
    task_id: i64,
    src_path: String,
    file_name: String,
) -> Result<TaskAttachment, String> {
    let dir = attachments_dir();
    let ext = file_name.rsplit('.').next().unwrap_or("bin");
    let stored_name = format!("{}.{}", Uuid::new_v4(), ext);
    let dest = dir.join(&stored_name);

    fs::copy(&src_path, &dest).map_err(|e| format!("复制文件失败: {}", e))?;

    let size = fs::metadata(&dest).map(|m| m.len() as i64).unwrap_or(0);
    let file_type = detect_file_type(&file_name).to_string();
    let dest_str = dest.to_string_lossy().to_string();

    let result = sqlx::query(
        "INSERT INTO task_attachments (task_id, file_name, file_path, file_type, file_size)
         VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(task_id)
    .bind(&file_name)
    .bind(&dest_str)
    .bind(&file_type)
    .bind(size)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let row = sqlx::query_as::<_, TaskAttachment>(
        "SELECT id, task_id, file_name, file_path, file_type, file_size, created_at
         FROM task_attachments WHERE id = ?1",
    )
    .bind(result.last_insert_rowid())
    .fetch_one(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(row)
}

#[tauri::command]
pub async fn get_attachments(
    state: State<'_, AppState>,
    task_id: i64,
) -> Result<Vec<TaskAttachment>, String> {
    let rows = sqlx::query_as::<_, TaskAttachment>(
        "SELECT id, task_id, file_name, file_path, file_type, file_size, created_at
         FROM task_attachments WHERE task_id = ?1 ORDER BY created_at DESC",
    )
    .bind(task_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub async fn delete_attachment(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let row = sqlx::query_as::<_, (String,)>("SELECT file_path FROM task_attachments WHERE id = ?1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some((file_path,)) = row {
        let _ = fs::remove_file(file_path);
    }

    sqlx::query("DELETE FROM task_attachments WHERE id = ?1")
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn read_image_base64(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("读取图片失败: {}", e))?;
    Ok(base64_encode(&bytes))
}

fn base64_encode(input: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    let mut i = 0;
    while i < input.len() {
        let b0 = input[i] as u32;
        let b1 = if i + 1 < input.len() { input[i + 1] as u32 } else { 0 };
        let b2 = if i + 2 < input.len() { input[i + 2] as u32 } else { 0 };
        result.push(CHARS[((b0 >> 2) & 0x3F) as usize] as char);
        result.push(CHARS[(((b0 << 4) | (b1 >> 4)) & 0x3F) as usize] as char);
        result.push(if i + 1 < input.len() {
            CHARS[(((b1 << 2) | (b2 >> 6)) & 0x3F) as usize] as char
        } else {
            '='
        });
        result.push(if i + 2 < input.len() {
            CHARS[(b2 & 0x3F) as usize] as char
        } else {
            '='
        });
        i += 3;
    }
    result
}
