use tauri::State;
use crate::domain::{Task, TimeBlock, AddTaskInput, TaskTransitionInput, UpdateTaskInput, DbState};
use crate::services;
use crate::domain::Result;

#[tauri::command]
pub async fn get_today_completed_duration(state: State<'_, DbState>, workspace_id: i64) -> Result<i64> {
    services::timeline::get_today_completed_duration(&state.pool, workspace_id).await
}

#[tauri::command]
pub async fn get_timeline(state: State<'_, DbState>, workspace_id: i64, date: Option<String>) -> Result<Vec<TimeBlock>> {
    services::timeline::get_timeline(&state.pool, workspace_id, date).await
}

#[tauri::command]
pub async fn get_inbox(state: State<'_, DbState>, workspace_id: i64) -> Result<Vec<Task>> {
    services::timeline::get_inbox(&state.pool, workspace_id).await
}

#[tauri::command]
pub async fn add_task(state: State<'_, DbState>, input: AddTaskInput) -> Result<()> {
    services::timeline::add_task(&state.pool, input).await
}

#[tauri::command]
pub async fn update_task(state: State<'_, DbState>, input: UpdateTaskInput) -> Result<()> {
    services::timeline::update_task(&state.pool, input).await
}

#[tauri::command]
pub async fn move_to_inbox(state: State<'_, DbState>, block_id: i64) -> Result<()> {
    services::timeline::move_to_inbox(&state.pool, block_id).await
}

#[tauri::command]
pub async fn move_to_timeline(state: State<'_, DbState>, task_id: i64, workspace_id: i64) -> Result<()> {
    services::timeline::move_to_timeline(&state.pool, task_id, workspace_id).await
}

#[tauri::command]
pub async fn move_all_to_timeline(state: State<'_, DbState>, workspace_id: i64) -> Result<()> {
    services::timeline::move_all_to_timeline(&state.pool, workspace_id).await
}

#[tauri::command]
pub async fn delete_task(state: State<'_, DbState>, id: i64) -> Result<()> {
    services::timeline::delete_task(&state.pool, id).await
}

#[tauri::command]
pub async fn handle_split_task_deletion(state: State<'_, DbState>, task_id: i64, keep_past: bool) -> Result<()> {
    services::timeline::handle_split_task_deletion(&state.pool, task_id, keep_past).await
}

#[tauri::command]
pub async fn process_task_transition(state: State<'_, DbState>, input: TaskTransitionInput) -> Result<()> {
    services::timeline::process_task_transition(&state.pool, input).await
}

#[tauri::command]
pub async fn update_block_status(state: State<'_, DbState>, block_id: i64, status: String) -> Result<()> {
    services::timeline::update_block_status(&state.pool, block_id, status).await
}

#[tauri::command]
pub async fn reorder_blocks(state: State<'_, DbState>, workspace_id: i64, block_ids: Vec<i64>) -> Result<()> {
    services::timeline::reorder_blocks(&state.pool, workspace_id, block_ids).await
}

#[tauri::command]
pub async fn reorder_inbox(state: State<'_, DbState>, workspace_id: i64, task_ids: Vec<i64>) -> Result<()> {
    services::timeline::reorder_inbox(&state.pool, workspace_id, task_ids).await
}

#[tauri::command]
pub async fn move_task_step(state: State<'_, DbState>, workspace_id: i64, block_id: i64, direction: String) -> Result<()> {
    services::timeline::move_task_step(&state.pool, workspace_id, block_id, direction).await
}

#[tauri::command]
pub async fn move_task_to_priority(state: State<'_, DbState>, workspace_id: i64, block_id: i64) -> Result<()> {
    services::timeline::move_task_to_priority(&state.pool, workspace_id, block_id).await
}

#[tauri::command]
pub async fn move_task_to_bottom(state: State<'_, DbState>, workspace_id: i64, block_id: i64) -> Result<()> {
    services::timeline::move_task_to_bottom(&state.pool, workspace_id, block_id).await
}

#[tauri::command]
pub async fn get_active_dates(state: State<'_, DbState>, workspace_id: i64) -> Result<Vec<String>> {
    services::timeline::get_active_dates(&state.pool, workspace_id).await
}

#[tauri::command]
pub async fn get_greeting(state: State<'_, DbState>, workspace_id: i64, lang: String) -> Result<String> {
    services::timeline::get_greeting(&state.pool, workspace_id, lang).await
}
