use sqlx::SqlitePool;
use crate::domain::{User, Result, AppError};
use crate::database;

pub async fn get_user(pool: &SqlitePool) -> Result<Option<User>> {
    database::user::get_user(pool).await
}

pub async fn save_user(
    pool: &SqlitePool,
    nickname: &str,
    gemini_api_key: Option<&str>,
    lang: &str,
    is_notification_enabled: bool,
    is_free_user: bool,
    day_start_time: &str,
) -> Result<User> {
    database::user::save_user(
        pool, 
        nickname, 
        gemini_api_key, 
        lang, 
        is_notification_enabled, 
        is_free_user, 
        day_start_time
    ).await?;
    
    database::user::get_user(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found after save".to_string()))
}

pub async fn check_user_exists(pool: &SqlitePool) -> Result<bool> {
    database::user::check_user_exists(pool).await
}
