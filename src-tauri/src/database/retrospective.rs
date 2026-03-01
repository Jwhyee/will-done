use sqlx::SqlitePool;
use chrono::Local;
use crate::models::Retrospective;
use crate::error::Result;

pub async fn get_saved_retrospectives(
    pool: &SqlitePool,
    workspace_id: i64,
    date_label: &str,
) -> Result<Vec<Retrospective>> {
    let retros = sqlx::query_as::<_, Retrospective>(
        "SELECT * FROM retrospectives WHERE workspace_id = ?1 AND date_label = ?2 ORDER BY created_at DESC"
    )
    .bind(workspace_id)
    .bind(date_label)
    .fetch_all(pool)
    .await?;
    Ok(retros)
}

pub async fn get_latest_saved_retrospective(
    pool: &SqlitePool,
    workspace_id: i64,
) -> Result<Option<Retrospective>> {
    let retro = sqlx::query_as::<_, Retrospective>(
        "SELECT * FROM retrospectives WHERE workspace_id = ?1 ORDER BY created_at DESC LIMIT 1"
    )
    .bind(workspace_id)
    .fetch_optional(pool)
    .await?;
    Ok(retro)
}

pub async fn check_retrospective_exists(
    pool: &SqlitePool,
    workspace_id: i64,
    date_label: &str,
    retro_type: &str,
) -> Result<bool> {
    let existing: Option<Retrospective> = sqlx::query_as(
        "SELECT * FROM retrospectives WHERE workspace_id = ?1 AND date_label = ?2 AND retro_type = ?3"
    )
    .bind(workspace_id)
    .bind(date_label)
    .bind(retro_type)
    .fetch_optional(pool)
    .await?;
    Ok(existing.is_some())
}

pub async fn save_retrospective(
    pool: &SqlitePool,
    workspace_id: i64,
    retro_type: &str,
    content: &str,
    date_label: &str,
    used_model: Option<&str>,
) -> Result<Retrospective> {
    let now = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    let result = sqlx::query(
        "INSERT INTO retrospectives (workspace_id, retro_type, content, date_label, created_at, used_model) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
    )
    .bind(workspace_id)
    .bind(retro_type)
    .bind(content)
    .bind(date_label)
    .bind(&now)
    .bind(used_model)
    .execute(pool)
    .await?;

    let retro_id = result.last_insert_rowid();

    Ok(Retrospective {
        id: retro_id,
        workspace_id,
        retro_type: retro_type.to_string(),
        content: content.to_string(),
        date_label: date_label.to_string(),
        created_at: now,
        used_model: used_model.map(|s| s.to_string()),
    })
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
