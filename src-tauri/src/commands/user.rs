use tauri::State;
use crate::domain::{User, DbState};
use crate::services;
use crate::domain::Result;

#[tauri::command]
pub async fn get_user(state: State<'_, DbState>) -> Result<Option<User>> {
    services::user::get_user(&state.pool).await
}

#[tauri::command]
pub async fn save_user(
    state: State<'_, DbState>,
    nickname: String,
    gemini_api_key: Option<String>,
    lang: String,
    is_notification_enabled: bool,
    is_free_user: bool,
    day_start_time: String,
) -> Result<User> {
    services::user::save_user(
        &state.pool,
        &nickname,
        gemini_api_key.as_deref(),
        &lang,
        is_notification_enabled,
        is_free_user,
        &day_start_time,
    ).await
}

#[tauri::command]
pub async fn check_user_exists(state: State<'_, DbState>) -> Result<bool> {
    services::user::check_user_exists(&state.pool).await
}
