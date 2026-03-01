use sqlx::SqlitePool;
use crate::models::User;
use crate::error::Result;

pub async fn get_user(pool: &SqlitePool) -> Result<Option<User>> {
    let user = sqlx::query_as::<_, User>("SELECT id, nickname, gemini_api_key, lang, last_successful_model FROM users WHERE id = 1")
        .fetch_optional(pool)
        .await?;
    Ok(user)
}

pub async fn save_user(
    pool: &SqlitePool,
    nickname: &str,
    gemini_api_key: Option<&str>,
    lang: &str,
) -> Result<()> {
    sqlx::query(
        "INSERT INTO users (id, nickname, gemini_api_key, lang) 
         VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            nickname = excluded.nickname,
            gemini_api_key = excluded.gemini_api_key,
            lang = excluded.lang",
    )
    .bind(nickname)
    .bind(gemini_api_key)
    .bind(lang)
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
        sqlx::query("CREATE TABLE users (id INTEGER PRIMARY KEY CHECK (id = 1), nickname TEXT NOT NULL, gemini_api_key TEXT, lang TEXT NOT NULL DEFAULT 'en', last_successful_model TEXT)").execute(&pool).await.unwrap();

        // First save
        save_user(&pool, "Alice", Some("key1"), "en").await.unwrap();
        
        let user = get_user(&pool).await.unwrap().unwrap();
        assert_eq!(user.nickname, "Alice");
        assert_eq!(user.gemini_api_key, Some("key1".to_string()));

        // Update
        save_user(&pool, "Alice Updated", Some("key2"), "ko").await.unwrap();
        
        let user = get_user(&pool).await.unwrap().unwrap();
        assert_eq!(user.nickname, "Alice Updated");
        assert_eq!(user.gemini_api_key, Some("key2".to_string()));
        assert_eq!(user.lang, "ko");

        // Clear API Key
        save_user(&pool, "Alice Updated", None, "ko").await.unwrap();
        let user = get_user(&pool).await.unwrap().unwrap();
        assert_eq!(user.gemini_api_key, None);
    }
}
