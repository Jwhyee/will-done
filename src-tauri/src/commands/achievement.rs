use tauri::State;
use crate::domain::{Achievement, DbState, DbGeminiModel};
use crate::services;
use crate::domain::Result;

#[tauri::command]
pub async fn generate_achievement(
    state: State<'_, DbState>,
    workspace_id: i64,
    start_date: String, // "YYYY-MM-DD"
    end_date: String,   // "YYYY-MM-DD"
    achievement_type: String, // "DAILY"
    date_label: String, // "2026-03-01"
    force_retry: bool,
    overwrite: bool,
    target_model: Option<String>,
) -> Result<Achievement> {
    services::achievement::generate_achievement(
        &state.pool,
        workspace_id,
        &start_date,
        &end_date,
        &achievement_type,
        &date_label,
        force_retry,
        overwrite,
        target_model,
    ).await
}

#[tauri::command]
pub async fn get_saved_achievements(
    state: State<'_, DbState>,
    workspace_id: i64,
    date_label: String,
) -> Result<Vec<Achievement>> {
    services::achievement::get_saved_achievements(&state.pool, workspace_id, &date_label).await
}

#[tauri::command]
pub async fn get_latest_saved_achievement(
    state: State<'_, DbState>,
    workspace_id: i64,
) -> Result<Option<Achievement>> {
    services::achievement::get_latest_saved_achievement(&state.pool, workspace_id).await
}

#[tauri::command]
pub async fn fetch_available_models(
    state: State<'_, DbState>,
) -> Result<Vec<DbGeminiModel>> {
    services::achievement::fetch_available_models(&state.pool).await
}
