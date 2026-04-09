use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const API_URL: &str = "https://api.deepseek.com/v1/chat/completions";
const MODEL: &str = "deepseek-chat";

// ─── 通用 API 调用 ────────────────────────────────────────────────
pub async fn call_deepseek(api_key: &str, system: &str, user_msg: &str) -> Result<String, String> {
    let client = Client::new();

    let body = json!({
        "model": MODEL,
        "max_tokens": 1024,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user",   "content": user_msg }
        ]
    });

    let resp = client
        .post(API_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("网络错误: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("API错误 {}: {}", status, text));
    }

    let data: Value = resp.json().await.map_err(|e| e.to_string())?;
    let text = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    Ok(text)
}

// ─── 自然语言 → 结构化任务 JSON ──────────────────────────────────
pub async fn parse_task_from_nl(api_key: &str, input: &str) -> Result<String, String> {
    let today = chrono::Local::now().format("%Y-%m-%d %H:%M").to_string();

    let system = format!(
        r#"你是一个任务解析助手。当前时间是 {}。
用户用自然语言描述任务，你需要将其解析为 JSON 格式。

规则：
1. 只输出 JSON，不要任何解释、markdown代码块或多余文字
2. JSON 字段：title(string), category(string), due_at(string|null), priority(number), note(string|null)
3. category 只能是以下之一：课程、社团、科研、生活、其他
4. priority：1=紧急, 2=普通, 3=低
5. due_at 格式：YYYY-MM-DDTHH:mm:ss，若用户没说截止时间则为 null
6. 时间解析：
   - "明天" = 明天23:59:00
   - "下周X" = 下周对应星期的23:59:00
   - "X月X日" = 当年该日期的23:59:00
   - "今晚" = 今天23:59:00
   - "后天" = 后天23:59:00

示例输入："下周五交数据库大作业"
示例输出：{{"title":"提交数据库大作业","category":"课程","due_at":"2025-04-18T23:59:00","priority":2,"note":null}}"#,
        today
    );

    call_deepseek(api_key, &system, input).await
}

// ─── 任务拆解 → 子任务数组 JSON ──────────────────────────────────
pub async fn breakdown_task(
    api_key: &str,
    task_title: &str,
    task_due: Option<&str>,
    conversation: &str,
) -> Result<String, String> {
    let today = chrono::Local::now().format("%Y-%m-%d %H:%M").to_string();
    let due_info = task_due
        .map(|d| format!("截止时间：{}", d))
        .unwrap_or_else(|| "无截止时间".to_string());

    let system = format!(
        r#"你是一个任务拆解助手。当前时间是 {}。
任务标题：{}
{}

将任务拆解为可执行的子任务，输出 JSON 数组。
规则：
1. 只输出 JSON 数组，不要任何解释或 markdown
2. 每个子任务字段：title(string), suggested_due_at(string|null), estimate_hours(number|null), note(string|null)
3. 子任务数量：3-6个，具体可执行
4. suggested_due_at 格式：YYYY-MM-DDTHH:mm:ss，合理分配在截止时间之前
5. estimate_hours 是预计需要的小时数

示例输出：
[
  {{"title":"收集相关资料和文献","suggested_due_at":"2025-04-10T23:59:00","estimate_hours":2,"note":"重点看近三年的论文"}},
  {{"title":"完成数据库设计","suggested_due_at":"2025-04-14T23:59:00","estimate_hours":4,"note":null}}
]"#,
        today, task_title, due_info
    );

    let user_msg = if conversation.is_empty() {
        "请拆解这个任务".to_string()
    } else {
        conversation.to_string()
    };

    call_deepseek(api_key, &system, &user_msg).await
}

// ─── 生成周报文字 ────────────────────────────────────────────────
#[derive(Serialize, Deserialize)]
pub struct TaskSummary {
    pub title: String,
    pub due_at: Option<String>,
    pub category: String,
}

pub async fn generate_weekly_report(
    api_key: &str,
    tasks: Vec<TaskSummary>,
) -> Result<String, String> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let tasks_json = serde_json::to_string(&tasks).unwrap_or_default();

    let system = "你是一个任务助手，用简洁友好的中文生成任务总结报告。输出纯文本，不超过250字。按紧急程度分析，给出优先级建议，语气积极鼓励。".to_string();

    let user_msg = format!(
        "今天是{}。以下是所有待完成任务（含截止时间）：{}\n请：1)指出最紧急的2-3项 2)按分类给出本周重点 3)给出一句鼓励的话。",
        today,
        tasks_json
    );

    call_deepseek(api_key, &system, &user_msg).await
}