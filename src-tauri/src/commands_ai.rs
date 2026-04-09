use crate::ai;
use crate::config::{load_config, save_config};

// ─── 保存 API Key ────────────────────────────────────────────────
#[tauri::command]
pub async fn set_api_key(key: String) -> Result<(), String> {
    let mut config = load_config();
    config.api_key = if key.is_empty() { None } else { Some(key) };
    save_config(&config)
}

// ─── 检查 API Key 是否已设置 ─────────────────────────────────────
#[tauri::command]
pub async fn get_api_key_status() -> bool {
    load_config().api_key.is_some()
}

// ─── 自然语言解析任务 ────────────────────────────────────────────
#[tauri::command]
pub async fn parse_nl_task(input: String) -> Result<String, String> {
    let config = load_config();
    let api_key = config.api_key.ok_or("未设置 API Key，请先在设置中填写")?;
    ai::parse_task_from_nl(&api_key, &input).await
}

// ─── 拆解任务 ────────────────────────────────────────────────────
#[tauri::command]
pub async fn ai_breakdown_task(
    task_title: String,
    task_due: Option<String>,
    conversation: String,
) -> Result<String, String> {
    let config = load_config();
    let api_key = config.api_key.ok_or("未设置 API Key")?;
    ai::breakdown_task(&api_key, &task_title, task_due.as_deref(), &conversation).await
}

// ─── 触发周报（手动 + 自动）────────────────────────────────────
#[tauri::command]
pub async fn check_weekly_report(
    app: tauri::AppHandle,
    tasks_json: String,
) -> Result<String, String> {
    use chrono::{Datelike, Local, Weekday};
    use tauri_plugin_notification::NotificationExt;

    let today = Local::now();
    let is_monday = today.weekday() == Weekday::Mon;
    let today_str = today.format("%Y-%m-%d").to_string();

    let mut config = load_config();

    // 判断今天是否已经发过
    let already_sent = config
        .weekly_report_sent_date
        .as_deref()
        .map(|d| d == today_str)
        .unwrap_or(false);

    if !is_monday || already_sent {
        return Ok("skip".to_string());
    }

    // 解析任务列表
    let tasks: Vec<ai::TaskSummary> = serde_json::from_str(&tasks_json)
        .unwrap_or_default();

    if tasks.is_empty() {
        return Ok("no_tasks".to_string());
    }

    // 生成周报文字
    let config2 = config.clone();
    let report = if let Some(key) = &config2.api_key {
        ai::generate_weekly_report(key, tasks).await
            .unwrap_or_else(|_| format!("本周共有 {} 项任务，加油！", 
                serde_json::from_str::<Vec<serde_json::Value>>(&tasks_json)
                    .map(|v| v.len()).unwrap_or(0)))
    } else {
        format!("本周共有 {} 项任务到期，请及时完成！",
            serde_json::from_str::<Vec<serde_json::Value>>(&tasks_json)
                .map(|v| v.len()).unwrap_or(0))
    };

    // 发系统通知
    app.notification()
        .builder()
        .title("📅 本周任务周报")
        .body(&report)
        .show()
        .map_err(|e| e.to_string())?;

    // 记录今天已发送
    config.weekly_report_sent_date = Some(today_str);
    save_config(&config)?;

    Ok(report)
}

#[tauri::command]
pub async fn generate_full_report(tasks_json: String) -> Result<String, String> {
    let config = load_config();

    let tasks: Vec<ai::TaskSummary> = serde_json::from_str(&tasks_json).unwrap_or_default();

    if tasks.is_empty() {
        return Ok("当前没有待完成的任务，继续保持！".to_string());
    }

    if let Some(key) = config.api_key {
        ai::generate_weekly_report(&key, tasks).await
    } else {
        Ok(format!("当前共有 {} 项待完成任务，请及时处理！", tasks.len()))
    }
}