use crate::models::{Task, TimelineEntry, TaskInput};
use crate::usecases::scheduling::{auto_schedule_task, get_timeline as fetch_timeline, get_greeting as fetch_greeting};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub fn add_task(
    workspace_id: i64,
    title: String,
    planning_memo: Option<String>,
    duration_minutes: i64,
    is_urgent: bool,
    target_date: String,
    state: State<'_, Mutex<Connection>>,
) -> Result<Task, String> {
    let mut conn = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;

    let input = TaskInput {
        title,
        planning_memo,
        duration_minutes,
        is_urgent,
    };

    auto_schedule_task(&mut conn, workspace_id, input, target_date)
}

#[tauri::command]
pub fn get_timeline(
    workspace_id: i64,
    date: String,
    state: State<'_, Mutex<Connection>>,
) -> Result<Vec<TimelineEntry>, String> {
    let conn = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    fetch_timeline(&conn, workspace_id, date)
}

#[tauri::command]
pub fn get_greeting(
    nickname: String,
    workspace_id: i64,
    state: State<'_, Mutex<Connection>>,
) -> Result<String, String> {
    let conn = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;

    // Check if there's an active task
    let mut stmt = conn.prepare(
        "SELECT COUNT(*) FROM tasks WHERE workspace_id = ?1 AND status = 'InProgress'"
    ).map_err(|e| format!("Prepare failed: {}", e))?;

    let active_count: i64 = stmt
        .query_row([workspace_id], |row| row.get(0))
        .map_err(|e| format!("Query failed: {}", e))?;

    let has_active = active_count > 0;
    Ok(fetch_greeting(&nickname, has_active))
}
