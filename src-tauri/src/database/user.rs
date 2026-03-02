use sqlx::SqlitePool;
use crate::models::User;
use crate::error::Result;

pub async fn get_user(pool: &SqlitePool) -> Result<Option<User>> {
    let user = sqlx::query_as::<_, User>("SELECT id, nickname, gemini_api_key, lang, last_successful_model, is_notification_enabled, day_start_time FROM users WHERE id = 1")
        .fetch_optional(pool)
        .await?;
    Ok(user)
}

pub async fn save_user(
    pool: &SqlitePool,
    nickname: &str,
    gemini_api_key: Option<&str>,
    lang: &str,
    is_notification_enabled: bool,
    day_start_time: &str,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO users (id, nickname, gemini_api_key, lang, is_notification_enabled, day_start_time) 
         VALUES (1, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            nickname = excluded.nickname,
            gemini_api_key = excluded.gemini_api_key,
            lang = excluded.lang,
            is_notification_enabled = excluded.is_notification_enabled,
            day_start_time = excluded.day_start_time",
    )
    .bind(nickname)
    .bind(gemini_api_key)
    .bind(lang)
    .bind(is_notification_enabled)
    .bind(day_start_time)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn save_last_model(
    pool: &SqlitePool,
    model: &str,
) -> Result<()> {
    sqlx::query("UPDATE users SET last_successful_model = ?1 WHERE id = 1")
        .bind(model)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn check_user_exists(pool: &SqlitePool) -> Result<bool> {
    let result = sqlx::query("SELECT 1 FROM users WHERE id = 1")
        .fetch_optional(pool)
        .await?;
    Ok(result.is_some())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePool;

    #[tokio::test]
    async fn test_save_and_get_user() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::query("CREATE TABLE users (id INTEGER PRIMARY KEY CHECK (id = 1), nickname TEXT NOT NULL, gemini_api_key TEXT, lang TEXT NOT NULL DEFAULT 'en', last_successful_model TEXT, is_notification_enabled BOOLEAN NOT NULL DEFAULT 0, day_start_time TEXT NOT NULL DEFAULT '04:00')").execute(&pool).await.unwrap();

        // First save
        save_user(&pool, "Alice", Some("key1"), "en", true, "04:00").await.unwrap();
        
        let user = get_user(&pool).await.unwrap().unwrap();
        assert_eq!(user.nickname, "Alice");
        assert_eq!(user.gemini_api_key, Some("key1".to_string()));
        assert_eq!(user.is_notification_enabled, true);
        assert_eq!(user.day_start_time, "04:00");

        // Update
        save_user(&pool, "Alice Updated", Some("key2"), "ko", false, "05:00").await.unwrap();
        
        let user = get_user(&pool).await.unwrap().unwrap();
        assert_eq!(user.nickname, "Alice Updated");
        assert_eq!(user.gemini_api_key, Some("key2".to_string()));
        assert_eq!(user.lang, "ko");
        assert_eq!(user.is_notification_enabled, false);
        assert_eq!(user.day_start_time, "05:00");

        // Clear API Key
        save_user(&pool, "Alice Updated", None, "ko", false, "05:00").await.unwrap();
        let user = get_user(&pool).await.unwrap().unwrap();
        assert_eq!(user.gemini_api_key, None);
    }
}
