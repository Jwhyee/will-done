use tauri::State;
use crate::domain::{Retrospective, DbState, DbGeminiModel};
use crate::services;
use crate::domain::Result;

#[tauri::command]
pub async fn generate_retrospective(
    state: State<'_, DbState>,
    workspace_id: i64,
    start_date: String, // "YYYY-MM-DD"
    end_date: String,   // "YYYY-MM-DD"
    retro_type: String, // "DAILY", "WEEKLY", "MONTHLY"
    date_label: String, // "2026-03-01", "2026-W09", etc.
    force_retry: bool,
) -> Result<Retrospective> {
    services::retrospective::generate_retrospective(
        &state.pool,
        workspace_id,
        &start_date,
        &end_date,
        &retro_type,
        &date_label,
        force_retry,
    ).await
}

#[tauri::command]
pub async fn get_saved_retrospectives(
    state: State<'_, DbState>,
    workspace_id: i64,
    date_label: String,
) -> Result<Vec<Retrospective>> {
    services::retrospective::get_saved_retrospectives(&state.pool, workspace_id, &date_label).await
}

#[tauri::command]
pub async fn get_latest_saved_retrospective(
    state: State<'_, DbState>,
    workspace_id: i64,
) -> Result<Option<Retrospective>> {
    services::retrospective::get_latest_saved_retrospective(&state.pool, workspace_id).await
}

#[tauri::command]
pub async fn fetch_available_models(
    state: State<'_, DbState>,
) -> Result<Vec<DbGeminiModel>> {
    services::retrospective::fetch_available_models(&state.pool).await
}
