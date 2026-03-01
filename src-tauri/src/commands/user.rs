use tauri::State;
use crate::models::{User, DbState};
use crate::database;
use crate::error::{Result, AppError};

#[tauri::command]
pub async fn get_user(state: State<'_, DbState>) -> Result<Option<User>> {
    database::user::get_user(&state.pool).await
}

#[tauri::command]
pub async fn save_user(
    state: State<'_, DbState>,
    nickname: String,
    gemini_api_key: Option<String>,
    lang: String,
) -> Result<User> {
    database::user::save_user(&state.pool, &nickname, gemini_api_key.as_deref(), &lang).await?;
    database::user::get_user(&state.pool).await?.ok_or(AppError::NotFound("User not found after save".to_string()))
}

#[tauri::command]
pub async fn check_user_exists(state: State<'_, DbState>) -> Result<bool> {
    database::user::check_user_exists(&state.pool).await
}
