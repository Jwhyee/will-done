use sqlx::{SqlitePool, Row};
use crate::domain::{DbGeminiModel, GeminiModelsResponse};
use reqwest;

pub const CREATE_GEMINI_MODELS_TABLE: &str = "
    CREATE TABLE IF NOT EXISTS gemini_models (
        model_name TEXT PRIMARY KEY,
        version REAL NOT NULL,
        lineup TEXT NOT NULL,
        thinkable BOOLEAN NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT 1
    );
";

pub const CREATE_AI_USAGE_LOGS_TABLE: &str = "
    CREATE TABLE IF NOT EXISTS ai_usage_logs (
        date TEXT PRIMARY KEY,
        status TEXT NOT NULL
    );
";

pub async fn get_active_models(pool: &SqlitePool) -> Result<Vec<DbGeminiModel>, sqlx::Error> {
    sqlx::query_as::<_, DbGeminiModel>(
        "SELECT * FROM gemini_models WHERE is_active = 1 ORDER BY sort_order ASC"
    )
    .fetch_all(pool)
    .await
}

pub async fn check_daily_exhausted_log(pool: &SqlitePool, date: &str) -> Result<bool, sqlx::Error> {
    let row = sqlx::query("SELECT COUNT(*) FROM ai_usage_logs WHERE date = ? AND status = 'EXHAUSTED'")
        .bind(date)
        .fetch_one(pool)
        .await?;
    
    let count: i32 = row.get(0);
    Ok(count > 0)
}

pub async fn log_exhausted(pool: &SqlitePool, date: &str) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT OR REPLACE INTO ai_usage_logs (date, status) VALUES (?, 'EXHAUSTED')")
        .bind(date)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn clear_exhausted(pool: &SqlitePool, date: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM ai_usage_logs WHERE date = ?")
        .bind(date)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn fetch_and_sync_models(pool: &SqlitePool, api_key: &str) -> Result<(), Box<dyn std::error::Error>> {
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models?key={}", api_key);
    let client = reqwest::Client::new();
    let response = client.get(url).send().await?.json::<GeminiModelsResponse>().await?;

    let allowed_suffixes = [
        "pro-preview", "pro", "flash-preview", "flash", "flash-lite-preview", "flash-lite"
    ];

    let mut filtered_models = Vec::new();

    for model in response.models {
        let name = model.name.replace("models/", "");
        
        let matched_suffix = allowed_suffixes.iter().find(|&&s| name.ends_with(s));
        
        if let Some(&suffix) = matched_suffix {
            // Extract version: e.g. gemini-1.5-pro -> 1.5
            let parts: Vec<&str> = name.split('-').collect();
            let version: f64 = parts.iter()
                .find(|&&p| p.chars().next().map_or(false, |c| c.is_digit(10)))
                .and_then(|&v| v.parse::<f64>().ok())
                .unwrap_or(1.0);

            let lineup = suffix.to_string();
            let thinkable = lineup.to_lowercase().contains("pro") || lineup.to_lowercase().contains("flash");

            filtered_models.push((name, version, lineup, thinkable));
        }
    }

    // Sort: 1. version DESC, 2. lineup priority
    let lineup_priority = |l: &str| {
        match l {
            "pro-preview" => 0,
            "pro" => 1,
            "flash-preview" => 2,
            "flash" => 3,
            "flash-lite-preview" => 4,
            "flash-lite" => 5,
            _ => 99,
        }
    };

    filtered_models.sort_by(|a, b| {
        b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal) // version DESC
            .then_with(|| lineup_priority(&a.2).cmp(&lineup_priority(&b.2))) // lineup priority ASC
    });

    // Start transaction
    let mut tx = pool.begin().await?;

    // Mark all as inactive first (soft delete)
    sqlx::query("UPDATE gemini_models SET is_active = 0").execute(&mut *tx).await?;

    // Upsert models with sort_order
    for (i, (name, version, lineup, thinkable)) in filtered_models.into_iter().enumerate() {
        sqlx::query(
            "INSERT INTO gemini_models (model_name, version, lineup, thinkable, sort_order, is_active)
             VALUES (?, ?, ?, ?, ?, 1)
             ON CONFLICT(model_name) DO UPDATE SET
                version = excluded.version,
                lineup = excluded.lineup,
                thinkable = excluded.thinkable,
                sort_order = excluded.sort_order,
                is_active = 1"
        )
        .bind(name)
        .bind(version)
        .bind(lineup)
        .bind(thinkable)
        .bind(i as i32)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    Ok(())
}
