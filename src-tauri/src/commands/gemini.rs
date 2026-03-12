use tauri::State;
use crate::domain::{DbState, Result};
use crate::services;

#[tauri::command]
pub async fn check_daily_exhausted_log(
    state: State<'_, DbState>,
) -> Result<bool> {
    services::gemini::check_daily_exhausted_log(&state.pool).await
}
