use sqlx::{SqlitePool};
use chrono::{NaiveDateTime, Duration, NaiveDate, Local};
use crate::domain::{Task, TimeBlock, UnpluggedTime};
use crate::domain::{Result};

pub async fn get_today_completed_duration(pool: &SqlitePool, workspace_id: i64, day_start_time: &str) -> Result<i64> {
    let now = Local::now();
    let current_time = now.format("%H:%M").to_string();
    let logical_date = if current_time < day_start_time.to_string() {
        now.date_naive() - Duration::days(1)
    } else {
        now.date_naive()
    };

    let start_of_day = NaiveDateTime::parse_from_str(&format!("{}T{}", logical_date.format("%Y-%m-%d"), day_start_time), "%Y-%m-%dT%H:%M").unwrap();
    let end_of_day = start_of_day + Duration::days(1) - Duration::seconds(1);

    let row: (Option<i64>,) = sqlx::query_as(
        "SELECT SUM((strftime('%s', end_time) - strftime('%s', start_time)) / 60) 
         FROM time_blocks 
         WHERE workspace_id = ?1 AND status IN ('DONE', 'PENDING', 'CONTINUED') AND start_time >= ?2 AND start_time <= ?3"
    )
    .bind(workspace_id)
    .bind(start_of_day.format("%Y-%m-%dT%H:%M:00").to_string())
    .bind(end_of_day.format("%Y-%m-%dT%H:%M:00").to_string())
    .fetch_one(pool)
    .await?;

    Ok(row.0.unwrap_or(0))
}

pub async fn get_timeline(pool: &SqlitePool, workspace_id: i64, target_date: NaiveDate, day_start_time: &str) -> Result<Vec<TimeBlock>> {
    let start_of_day = NaiveDateTime::parse_from_str(&format!("{}T{}", target_date.format("%Y-%m-%d"), day_start_time), "%Y-%m-%dT%H:%M").unwrap();
    let end_of_day = start_of_day + Duration::days(1) - Duration::seconds(1);

    let mut blocks = sqlx::query_as::<_, TimeBlock>(
        "SELECT tb.*, t.planning_memo, p.name as project_name, l.name as label_name, l.color as label_color 
         FROM time_blocks tb
         LEFT JOIN tasks t ON tb.task_id = t.id
         LEFT JOIN projects p ON t.project_id = p.id
         LEFT JOIN labels l ON t.label_id = l.id
         WHERE tb.workspace_id = ?1 AND tb.start_time >= ?2 AND tb.start_time <= ?3 
         ORDER BY tb.start_time ASC"
    )
    .bind(workspace_id)
    .bind(start_of_day.format("%Y-%m-%dT%H:%M:00").to_string())
    .bind(end_of_day.format("%Y-%m-%dT%H:%M:00").to_string())
    .fetch_all(pool)
    .await?;

    let unplugged: Vec<UnpluggedTime> = sqlx::query_as("SELECT * FROM unplugged_times WHERE workspace_id = ?1")
        .bind(workspace_id)
        .fetch_all(pool)
        .await?;

    use chrono::NaiveTime;
    for ut in unplugged {
        let ut_start_time = NaiveTime::parse_from_str(&ut.start_time, "%H:%M").unwrap();
        let ut_end_time = NaiveTime::parse_from_str(&ut.end_time, "%H:%M").unwrap();
        
        let mut ut_start_dt = target_date.and_time(ut_start_time);
        let mut ut_end_dt = target_date.and_time(ut_end_time);

        if ut_start_time < NaiveTime::parse_from_str(day_start_time, "%H:%M").unwrap() {
            ut_start_dt += Duration::days(1);
            ut_end_dt += Duration::days(1);
        }

        blocks.push(TimeBlock {
            id: -1,
            task_id: None,
            workspace_id,
            title: ut.label,
            start_time: ut_start_dt.format("%Y-%m-%dT%H:%M:00").to_string(),
            end_time: ut_end_dt.format("%Y-%m-%dT%H:%M:00").to_string(),
            status: "UNPLUGGED".to_string(),
            review_memo: None,
            planning_memo: None,
            is_urgent: false,
            project_name: None,
            label_name: None,
            label_color: None,
        });
    }

    blocks.sort_by(|a, b| a.start_time.cmp(&b.start_time));
    Ok(blocks)
}


pub async fn get_inbox(pool: &SqlitePool, workspace_id: i64) -> Result<Vec<Task>> {
    let list = sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE workspace_id = ?1 AND id NOT IN (SELECT task_id FROM time_blocks WHERE task_id IS NOT NULL) ORDER BY position ASC, id ASC"
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await?;
    Ok(list)
}

pub async fn get_active_dates(pool: &SqlitePool, workspace_id: i64) -> Result<Vec<String>> {
    use sqlx::Row;
    let rows = sqlx::query(
        "SELECT DISTINCT SUBSTR(start_time, 1, 10) as date_str FROM time_blocks WHERE workspace_id = ?1 ORDER BY date_str ASC"
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await?;

    let dates: Vec<String> = rows.iter().map(|r| {
        let s: String = r.get("date_str");
        s
    }).collect();

    Ok(dates)
}

pub async fn check_active_block_exists(pool: &SqlitePool, workspace_id: i64) -> Result<bool> {
    let active_block = sqlx::query("SELECT 1 FROM time_blocks WHERE workspace_id = ?1 AND status = 'NOW'")
        .bind(workspace_id)
        .fetch_optional(pool)
        .await?;
    Ok(active_block.is_some())
}

pub async fn get_unfinished_past_task_dates(pool: &SqlitePool, workspace_id: i64, day_start_time: &str) -> Result<Vec<String>> {
    let now = Local::now();
    let current_time = now.format("%H:%M").to_string();
    let current_logical_date = if current_time < day_start_time.to_string() {
        now.date_naive() - Duration::days(1)
    } else {
        now.date_naive()
    };
    let current_logical_date_str = current_logical_date.format("%Y-%m-%d").to_string();

    let rows = sqlx::query(
        "SELECT DISTINCT logical_date FROM (
            SELECT 
                CASE 
                    WHEN strftime('%H:%M', start_time) < ?1 
                    THEN date(start_time, '-1 day') 
                    ELSE date(start_time) 
                END as logical_date
            FROM time_blocks
            WHERE workspace_id = ?2 AND status = 'NOW'
        ) 
        WHERE logical_date < ?3
        ORDER BY logical_date ASC"
    )
    .bind(day_start_time)
    .bind(workspace_id)
    .bind(current_logical_date_str)
    .fetch_all(pool)
    .await?;

    use sqlx::Row;
    let dates: Vec<String> = rows.iter().map(|r| r.get::<String, _>("logical_date")).collect();
    Ok(dates)
}
