use sqlx::{SqlitePool, Sqlite, Transaction, Row};
use chrono::{NaiveDateTime, Duration, NaiveTime, NaiveDate, Local};
use crate::models::{Task, TimeBlock, UnpluggedTime, AddTaskInput, TaskTransitionInput};
use crate::error::Result;

pub async fn get_timeline(pool: &SqlitePool, workspace_id: i64, target_date: NaiveDate) -> Result<Vec<TimeBlock>> {
    let start_of_day = target_date.and_hms_opt(0, 0, 0).unwrap().format("%Y-%m-%dT%H:%M:%S").to_string();
    let end_of_day = target_date.and_hms_opt(23, 59, 59).unwrap().format("%Y-%m-%dT%H:%M:%S").to_string();

    let mut blocks = sqlx::query_as::<_, TimeBlock>(
        "SELECT * FROM time_blocks WHERE workspace_id = ?1 AND start_time >= ?2 AND start_time <= ?3 ORDER BY start_time ASC"
    )
    .bind(workspace_id)
    .bind(start_of_day)
    .bind(end_of_day)
    .fetch_all(pool)
    .await?;

    let unplugged: Vec<UnpluggedTime> = sqlx::query_as("SELECT * FROM unplugged_times WHERE workspace_id = ?1")
        .bind(workspace_id)
        .fetch_all(pool)
        .await?;

    for ut in unplugged {
        blocks.push(TimeBlock {
            id: -1,
            task_id: None,
            workspace_id,
            title: ut.label,
            start_time: target_date.and_time(NaiveTime::parse_from_str(&ut.start_time, "%H:%M").unwrap()).format("%Y-%m-%dT%H:%M:%S").to_string(),
            end_time: target_date.and_time(NaiveTime::parse_from_str(&ut.end_time, "%H:%M").unwrap()).format("%Y-%m-%dT%H:%M:%S").to_string(),
            status: "UNPLUGGED".to_string(),
            review_memo: None,
            is_urgent: false,
        });
    }

    blocks.sort_by(|a, b| a.start_time.cmp(&b.start_time));
    Ok(blocks)
}

pub async fn get_inbox(pool: &SqlitePool, workspace_id: i64) -> Result<Vec<Task>> {
    let list = sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE workspace_id = ?1 AND id NOT IN (SELECT task_id FROM time_blocks WHERE task_id IS NOT NULL)"
    )
    .bind(workspace_id)
    .fetch_all(pool)
    .await?;
    Ok(list)
}

pub async fn add_task(pool: &SqlitePool, input: AddTaskInput) -> Result<()> {
    let mut tx = pool.begin().await?;

    // 1. 태스크 생성
    let task_result = sqlx::query(
        "INSERT INTO tasks (workspace_id, title, planning_memo, estimated_minutes) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(input.workspace_id)
    .bind(&input.title)
    .bind(&input.planning_memo)
    .bind((input.hours * 60 + input.minutes) as i64)
    .execute(&mut *tx)
    .await?;

    let task_id = task_result.last_insert_rowid();

    // 2. 인박스 여부에 따른 처리
    if input.is_inbox.unwrap_or(false) {
        tx.commit().await?;
        return Ok(());
    }

    // 3. 자정 넘기는지 체크 (미리 계산)
    let now_dt = Local::now().naive_local();
    let duration = (input.hours * 60 + input.minutes) as i64;
    
    let current_start = if input.is_urgent {
        now_dt
    } else {
        let last_block: Option<(String,)> = sqlx::query_as("SELECT end_time FROM time_blocks WHERE workspace_id = ?1 AND status != 'UNPLUGGED' ORDER BY end_time DESC LIMIT 1")
            .bind(input.workspace_id)
            .fetch_optional(&mut *tx)
            .await?;

        if let Some((last_end,)) = last_block {
            let le = NaiveDateTime::parse_from_str(&last_end, "%Y-%m-%dT%H:%M:%S").unwrap_or(now_dt);
            if le < now_dt { now_dt } else { le }
        } else {
            now_dt
        }
    };

    let end_dt = current_start + Duration::minutes(duration);
    if end_dt.date() > current_start.date() {
        // 자정을 넘기면 스케줄링하지 않고 인박스에 둠
        tx.commit().await?;
        return Ok(());
    }

    // 4. 긴급 업무 여부에 따른 처리
    if input.is_urgent {
        let current_now: Option<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND status = 'NOW' LIMIT 1")
            .bind(input.workspace_id)
            .fetch_optional(&mut *tx)
            .await?;

        let urgent_duration = (input.hours * 60 + input.minutes) as i64;

        if let Some(block) = current_now {
            // 현재 태스크 중단 -> PENDING 처리 (찢어진 UI용)
            sqlx::query("UPDATE time_blocks SET end_time = ?1, status = 'PENDING' WHERE id = ?2")
                .bind(now_dt.format("%Y-%m-%dT%H:%M:%S").to_string())
                .bind(block.id)
                .execute(&mut *tx)
                .await?;

            let original_end = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
            let remaining_duration = (original_end - now_dt).num_minutes();

            // 긴급 업무 삽입
            schedule_task_blocks(&mut tx, input.workspace_id, task_id, &input.title, now_dt, urgent_duration, true).await?;

            // 남은 부분 삽입
            let resume_start = now_dt + Duration::minutes(urgent_duration);
            schedule_task_blocks(&mut tx, input.workspace_id, block.task_id.unwrap(), &block.title, resume_start, remaining_duration, block.is_urgent).await?;

            // 이후 블록 밀기
            shift_future_blocks(&mut tx, input.workspace_id, original_end, urgent_duration).await?;
        } else {
            schedule_task_blocks(&mut tx, input.workspace_id, task_id, &input.title, now_dt, urgent_duration, true).await?;
            shift_future_blocks(&mut tx, input.workspace_id, now_dt, urgent_duration).await?;
        }
    } else {
        schedule_task_blocks(&mut tx, input.workspace_id, task_id, &input.title, current_start, duration, false).await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn move_to_inbox(pool: &SqlitePool, block_id: i64) -> Result<()> {
    let mut tx = pool.begin().await?;
    
    let block: TimeBlock = sqlx::query_as("SELECT * FROM time_blocks WHERE id = ?1")
        .bind(block_id)
        .fetch_one(&mut *tx)
        .await?;

    if let Some(task_id) = block.task_id {
        sqlx::query("DELETE FROM time_blocks WHERE task_id = ?1")
            .bind(task_id)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn move_to_timeline(pool: &SqlitePool, task_id: i64, workspace_id: i64) -> Result<()> {
    let mut tx = pool.begin().await?;

    let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = ?1")
        .bind(task_id)
        .fetch_one(&mut *tx)
        .await?;

    let last_block: Option<(String,)> = sqlx::query_as("SELECT end_time FROM time_blocks WHERE workspace_id = ?1 AND status != 'UNPLUGGED' ORDER BY end_time DESC LIMIT 1")
        .bind(workspace_id)
        .fetch_optional(&mut *tx)
        .await?;

    let now_dt = Local::now().naive_local();
    let current_start = if let Some((last_end,)) = last_block {
        let le = NaiveDateTime::parse_from_str(&last_end, "%Y-%m-%dT%H:%M:%S").unwrap_or(now_dt);
        if le < now_dt { now_dt } else { le }
    } else {
        now_dt
    };

    let duration = if task.estimated_minutes > 0 { task.estimated_minutes as i64 } else { 30 };
    schedule_task_blocks(&mut tx, workspace_id, task_id, &task.title, current_start, duration, false).await?;

    tx.commit().await?;
    Ok(())
}

pub async fn move_all_to_timeline(pool: &SqlitePool, workspace_id: i64) -> Result<()> {
    let mut tx = pool.begin().await?;

    let tasks = sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE workspace_id = ?1 AND id NOT IN (SELECT task_id FROM time_blocks WHERE task_id IS NOT NULL)"
    )
    .bind(workspace_id)
    .fetch_all(&mut *tx)
    .await?;

    for task in tasks {
        let last_block: Option<(String,)> = sqlx::query_as("SELECT end_time FROM time_blocks WHERE workspace_id = ?1 AND status != 'UNPLUGGED' ORDER BY end_time DESC LIMIT 1")
            .bind(workspace_id)
            .fetch_optional(&mut *tx)
            .await?;

        let now_dt = Local::now().naive_local();
        let current_start = if let Some((last_end,)) = last_block {
            let le = NaiveDateTime::parse_from_str(&last_end, "%Y-%m-%dT%H:%M:%S").unwrap_or(now_dt);
            if le < now_dt { now_dt } else { le }
        } else {
            now_dt
        };

        let duration = if task.estimated_minutes > 0 { task.estimated_minutes as i64 } else { 30 };
        
        let end_dt = current_start + Duration::minutes(duration);
        if end_dt.date() > current_start.date() {
            break;
        }

        schedule_task_blocks(&mut tx, workspace_id, task.id, &task.title, current_start, duration, false).await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn delete_task(pool: &SqlitePool, id: i64) -> Result<()> {
    sqlx::query("DELETE FROM tasks WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn process_task_transition(pool: &SqlitePool, input: TaskTransitionInput) -> Result<()> {
    let mut tx = pool.begin().await?;

    let block: TimeBlock = sqlx::query_as("SELECT * FROM time_blocks WHERE id = ?1")
        .bind(input.block_id)
        .fetch_one(&mut *tx)
        .await?;

    match input.action.as_str() {
        "COMPLETE_ON_TIME" | "COMPLETE_NOW" | "COMPLETE_AGO" => {
            let end_dt = if input.action == "COMPLETE_NOW" {
                Local::now().naive_local()
            } else if input.action == "COMPLETE_AGO" {
                Local::now().naive_local() - Duration::minutes(input.extra_minutes.unwrap_or(0) as i64)
            } else {
                NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap()
            };

            if input.action != "COMPLETE_ON_TIME" {
                let original_end = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
                let diff = (end_dt - original_end).num_minutes();
                if diff != 0 {
                    shift_future_blocks(&mut tx, block.workspace_id, original_end, diff).await?;
                }
            }

            sqlx::query("UPDATE time_blocks SET status = 'DONE', end_time = ?1, review_memo = ?2 WHERE id = ?3")
                .bind(end_dt.format("%Y-%m-%dT%H:%M:%S").to_string())
                .bind(input.review_memo)
                .bind(input.block_id)
                .execute(&mut *tx)
                .await?;
        },
        "DELAY" => {
            let extra = input.extra_minutes.unwrap_or(0) as i64;
            let current_end = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
            let new_end = current_end + Duration::minutes(extra);

            sqlx::query("UPDATE time_blocks SET end_time = ?1 WHERE id = ?2")
                .bind(new_end.format("%Y-%m-%dT%H:%M:%S").to_string())
                .bind(input.block_id)
                .execute(&mut *tx)
                .await?;

            shift_future_blocks(&mut tx, block.workspace_id, current_end, extra).await?;
        },
        _ => return Err(crate::error::AppError::InvalidInput("Invalid action".to_string())),
    }

    tx.commit().await?;
    Ok(())
}

pub async fn get_active_dates(pool: &SqlitePool, workspace_id: i64) -> Result<Vec<String>> {
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

pub async fn update_block_status(pool: &SqlitePool, block_id: i64, status: &str) -> Result<()> {
    sqlx::query("UPDATE time_blocks SET status = ?1 WHERE id = ?2")
        .bind(status)
        .bind(block_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn reorder_blocks(pool: &SqlitePool, workspace_id: i64, block_ids: Vec<i64>) -> Result<()> {
    let mut tx = pool.begin().await?;

    let all_blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND status != 'DONE' ORDER BY start_time ASC")
        .bind(workspace_id)
        .fetch_all(&mut *tx)
        .await?;

    if all_blocks.is_empty() { return Ok(()); }

    let start_dt = NaiveDateTime::parse_from_str(&all_blocks[0].start_time, "%Y-%m-%dT%H:%M:%S").unwrap();
    let mut current_time = start_dt;

    let unplugged: Vec<UnpluggedTime> = sqlx::query_as("SELECT * FROM unplugged_times WHERE workspace_id = ?1")
        .bind(workspace_id)
        .fetch_all(&mut *tx)
        .await?;

    for id in block_ids {
        if let Some(block) = all_blocks.iter().find(|b| b.id == id).cloned() {
            if block.status == "UNPLUGGED" { continue; }

            let duration_min = (NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap() - 
                               NaiveDateTime::parse_from_str(&block.start_time, "%Y-%m-%dT%H:%M:%S").unwrap()).num_minutes();
            
            for ut in &unplugged {
                let ut_start = current_time.date().and_time(NaiveTime::parse_from_str(&ut.start_time, "%H:%M").unwrap());
                let ut_end = current_time.date().and_time(NaiveTime::parse_from_str(&ut.end_time, "%H:%M").unwrap());
                if current_time >= ut_start && current_time < ut_end {
                    current_time = ut_end;
                }
            }

            let new_end = current_time + Duration::minutes(duration_min);
            
            sqlx::query("UPDATE time_blocks SET start_time = ?1, end_time = ?2 WHERE id = ?3")
                .bind(current_time.format("%Y-%m-%dT%H:%M:%S").to_string())
                .bind(new_end.format("%Y-%m-%dT%H:%M:%S").to_string())
                .bind(block.id)
                .execute(&mut *tx)
                .await?;

            current_time = new_end;
        }
    }

    tx.commit().await?;
    Ok(())
}

async fn schedule_task_blocks(
    tx: &mut Transaction<'_, Sqlite>,
    workspace_id: i64,
    task_id: i64,
    title: &str,
    start_dt: NaiveDateTime,
    mut remaining_minutes: i64,
    is_urgent: bool
) -> Result<()> {
    let mut current_start = start_dt;
    
    let unplugged: Vec<UnpluggedTime> = sqlx::query_as("SELECT * FROM unplugged_times WHERE workspace_id = ?1")
        .bind(workspace_id)
        .fetch_all(&mut **tx)
        .await?;

    while remaining_minutes > 0 {
        let current_end = current_start + Duration::minutes(remaining_minutes);
        let mut split_at: Option<NaiveDateTime> = None;
        let mut resume_at: Option<NaiveDateTime> = None;

        for ut in &unplugged {
            let ut_start = current_start.date().and_time(NaiveTime::parse_from_str(&ut.start_time, "%H:%M").unwrap());
            let ut_end = current_start.date().and_time(NaiveTime::parse_from_str(&ut.end_time, "%H:%M").unwrap());

            if current_start < ut_start && current_end > ut_start {
                split_at = Some(ut_start);
                resume_at = Some(ut_end);
                break;
            }
            if current_start >= ut_start && current_start < ut_end {
                current_start = ut_end;
                continue;
            }
        }

        let end = split_at.unwrap_or(current_end);
        let duration = (end - current_start).num_minutes();

        if duration > 0 {
            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status, is_urgent) VALUES (?1, ?2, ?3, ?4, ?5, 'WILL', ?6)")
                .bind(task_id).bind(workspace_id).bind(title)
                .bind(current_start.format("%Y-%m-%dT%H:%M:%S").to_string())
                .bind(end.format("%Y-%m-%dT%H:%M:%S").to_string())
                .bind(is_urgent)
                .execute(&mut **tx).await?;
        }

        remaining_minutes -= duration;
        if let Some(r) = resume_at { current_start = r; } else { break; }
    }
    Ok(())
}

async fn shift_future_blocks(
    tx: &mut Transaction<'_, Sqlite>,
    workspace_id: i64,
    after_dt: NaiveDateTime,
    shift_minutes: i64
) -> Result<()> {
    let blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND start_time >= ?2 AND status = 'WILL'")
        .bind(workspace_id)
        .bind(after_dt.format("%Y-%m-%dT%H:%M:%S").to_string())
        .fetch_all(&mut **tx)
        .await?;

    for block in blocks {
        let new_start = NaiveDateTime::parse_from_str(&block.start_time, "%Y-%m-%dT%H:%M:%S").unwrap() + Duration::minutes(shift_minutes);
        let new_end = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap() + Duration::minutes(shift_minutes);
        
        sqlx::query("UPDATE time_blocks SET start_time = ?1, end_time = ?2 WHERE id = ?3")
            .bind(new_start.format("%Y-%m-%dT%H:%M:%S").to_string())
            .bind(new_end.format("%Y-%m-%dT%H:%M:%S").to_string())
            .bind(block.id)
            .execute(&mut **tx)
            .await?;
    }
    Ok(())
}

pub async fn check_active_block_exists(pool: &SqlitePool, workspace_id: i64) -> Result<bool> {
    let active_block = sqlx::query("SELECT 1 FROM time_blocks WHERE workspace_id = ?1 AND status = 'NOW'")
        .bind(workspace_id)
        .fetch_optional(pool)
        .await?;
    Ok(active_block.is_some())
}
