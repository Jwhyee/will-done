use sqlx::SqlitePool;
use chrono::Local;
use crate::domain::Achievement;
use crate::domain::Result;

pub async fn get_saved_achievements(
    pool: &SqlitePool,
    workspace_id: i64,
    date_label: &str,
) -> Result<Vec<Achievement>> {
    let retros = sqlx::query_as::<_, Achievement>(
        "SELECT * FROM achievements WHERE workspace_id = ?1 AND date_label = ?2 ORDER BY created_at DESC"
    )
    .bind(workspace_id)
    .bind(date_label)
    .fetch_all(pool)
    .await?;
    Ok(retros)
}

pub async fn get_latest_saved_achievement(
    pool: &SqlitePool,
    workspace_id: i64,
) -> Result<Option<Achievement>> {
    let retro = sqlx::query_as::<_, Achievement>(
        "SELECT * FROM achievements WHERE workspace_id = ?1 ORDER BY created_at DESC LIMIT 1"
    )
    .bind(workspace_id)
    .fetch_optional(pool)
    .await?;
    Ok(retro)
}

pub async fn check_achievement_exists(
    pool: &SqlitePool,
    workspace_id: i64,
    date_label: &str,
    achievement_type: &str,
) -> Result<bool> {
    let existing: Option<Achievement> = sqlx::query_as(
        "SELECT * FROM achievements WHERE workspace_id = ?1 AND date_label = ?2 AND achievement_type = ?3"
    )
    .bind(workspace_id)
    .bind(date_label)
    .bind(achievement_type)
    .fetch_optional(pool)
    .await?;
    Ok(existing.is_some())
}

pub async fn save_achievement(
    pool: &SqlitePool,
    workspace_id: i64,
    achievement_type: &str,
    content: &str,
    date_label: &str,
    used_model: Option<&str>,
) -> Result<Achievement> {
    let now = Local::now().format("%Y-%m-%dT%H:%M:00").to_string();
    let result = sqlx::query(
        "INSERT INTO achievements (workspace_id, achievement_type, content, date_label, created_at, used_model) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
    )
    .bind(workspace_id)
    .bind(achievement_type)
    .bind(content)
    .bind(date_label)
    .bind(&now)
    .bind(used_model)
    .execute(pool)
    .await?;

    let retro_id = result.last_insert_rowid();

    Ok(Achievement {
        id: retro_id,
        workspace_id,
        achievement_type: achievement_type.to_string(),
        content: content.to_string(),
        date_label: date_label.to_string(),
        created_at: now,
        used_model: used_model.map(|s| s.to_string()),
    })
}

pub async fn update_achievement(
    pool: &SqlitePool,
    workspace_id: i64,
    achievement_type: &str,
    content: &str,
    date_label: &str,
    used_model: Option<&str>,
) -> Result<Achievement> {
    let now = Local::now().format("%Y-%m-%dT%H:%M:00").to_string();
    sqlx::query(
        "UPDATE achievements SET content = ?1, created_at = ?2, used_model = ?3 WHERE workspace_id = ?4 AND date_label = ?5 AND achievement_type = ?6"
    )
    .bind(content)
    .bind(&now)
    .bind(used_model)
    .bind(workspace_id)
    .bind(date_label)
    .bind(achievement_type)
    .execute(pool)
    .await?;

    let retro = sqlx::query_as::<_, Achievement>(
        "SELECT * FROM achievements WHERE workspace_id = ?1 AND date_label = ?2 AND achievement_type = ?3 ORDER BY created_at DESC LIMIT 1"
    )
    .bind(workspace_id)
    .bind(date_label)
    .bind(achievement_type)
    .fetch_one(pool)
    .await?;

    Ok(retro)
}

pub async fn get_completed_task_blocks(
    pool: &SqlitePool,
    workspace_id: i64,
    start_time: &str,
    end_time: &str,
) -> Result<Vec<(String, Option<String>, Option<String>, String, String)>> {
    let blocks: Vec<(String, Option<String>, Option<String>, String, String)> = sqlx::query_as(
        "SELECT tb.title, t.planning_memo, tb.review_memo, tb.start_time, tb.end_time 
         FROM time_blocks tb
         LEFT JOIN tasks t ON tb.task_id = t.id
         WHERE tb.workspace_id = ?1 AND tb.status = 'DONE' AND tb.start_time >= ?2 AND tb.start_time <= ?3
         ORDER BY tb.start_time ASC"
    )
    .bind(workspace_id)
    .bind(start_time)
    .bind(end_time)
    .fetch_all(pool)
    .await?;
    Ok(blocks)
}
