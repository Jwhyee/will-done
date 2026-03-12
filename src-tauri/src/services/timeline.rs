use sqlx::{SqlitePool, Sqlite, Transaction};
use chrono::{NaiveDateTime, NaiveDate, Local, NaiveTime, Duration, Timelike};
use crate::domain::{Task, TimeBlock, AddTaskInput, TaskTransitionInput, UpdateTaskInput, Result, AppError, UnpluggedTime};
use crate::database;

pub async fn get_today_completed_duration(pool: &SqlitePool, workspace_id: i64) -> Result<i64> {
    let user = database::user::get_user(pool).await?.ok_or_else(|| AppError::NotFound("User not found".to_string()))?;
    database::timeline::get_today_completed_duration(pool, workspace_id, &user.day_start_time).await
}

pub async fn get_timeline(pool: &SqlitePool, workspace_id: i64, date: Option<String>) -> Result<Vec<TimeBlock>> {
    let user = database::user::get_user(pool).await?.ok_or_else(|| AppError::NotFound("User not found".to_string()))?;
    let day_start_time = user.day_start_time;
    
    let target_date = if let Some(d) = date {
        NaiveDate::parse_from_str(&d, "%Y-%m-%d").map_err(|e| AppError::DateParse(e.to_string()))?
    } else {
        let now = Local::now();
        let current_time = now.format("%H:%M").to_string();
        if current_time < day_start_time {
            now.date_naive() - Duration::days(1)
        } else {
            now.date_naive()
        }
    };
    database::timeline::get_timeline(pool, workspace_id, target_date, &day_start_time).await
}

pub async fn get_inbox(pool: &SqlitePool, workspace_id: i64) -> Result<Vec<Task>> {
    database::timeline::get_inbox(pool, workspace_id).await
}

pub async fn add_task(pool: &SqlitePool, input: AddTaskInput) -> Result<()> {
    let now_dt = Local::now().naive_local();
    add_task_at(pool, input, now_dt).await
}

pub async fn add_task_at(pool: &SqlitePool, input: AddTaskInput, now_dt: NaiveDateTime) -> Result<()> {
    let mut tx = pool.begin().await?;

    let mut project_id = None;
    if let Some(p_name) = &input.project_name {
        if !p_name.trim().is_empty() {
            let existing: Option<(i64,)> = sqlx::query_as("SELECT id FROM projects WHERE name = ?1").bind(p_name).fetch_optional(&mut *tx).await?;
            if let Some((id,)) = existing {
                project_id = Some(id);
                sqlx::query("UPDATE projects SET last_used = ?1 WHERE id = ?2").bind(Local::now().format("%Y-%m-%dT%H:%M:00").to_string()).bind(id).execute(&mut *tx).await?;
            } else {
                let res = sqlx::query("INSERT INTO projects (name, last_used) VALUES (?1, ?2)").bind(p_name).bind(Local::now().format("%Y-%m-%dT%H:%M:00").to_string()).execute(&mut *tx).await?;
                project_id = Some(res.last_insert_rowid());
            }
        }
    }

    let mut label_id = None;
    if let Some(l_name) = &input.label_name {
        if !l_name.trim().is_empty() {
            let existing: Option<(i64,)> = sqlx::query_as("SELECT id FROM labels WHERE name = ?1").bind(l_name).fetch_optional(&mut *tx).await?;
            if let Some((id,)) = existing {
                label_id = Some(id);
                sqlx::query("UPDATE labels SET last_used = ?1 WHERE id = ?2").bind(Local::now().format("%Y-%m-%dT%H:%M:00").to_string()).bind(id).execute(&mut *tx).await?;
            } else {
                let res = sqlx::query("INSERT INTO labels (name, color, last_used) VALUES (?1, '#808080', ?2)").bind(l_name).bind(Local::now().format("%Y-%m-%dT%H:%M:00").to_string()).execute(&mut *tx).await?;
                label_id = Some(res.last_insert_rowid());
            }
        }
    }

    let position = if input.is_inbox.unwrap_or(false) {
        let max_pos: (Option<i64>,) = sqlx::query_as("SELECT MAX(position) FROM tasks WHERE workspace_id = ?1 AND id NOT IN (SELECT task_id FROM time_blocks WHERE task_id IS NOT NULL)")
            .bind(input.workspace_id)
            .fetch_one(&mut *tx)
            .await?;
        max_pos.0.unwrap_or(0) + 1
    } else {
        0
    };

    let task_result = sqlx::query(
        "INSERT INTO tasks (workspace_id, title, planning_memo, estimated_minutes, project_id, label_id, position) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(input.workspace_id)
    .bind(&input.title)
    .bind(&input.planning_memo)
    .bind((input.hours * 60 + input.minutes) as i64)
    .bind(project_id)
    .bind(label_id)
    .bind(position)
    .execute(&mut *tx)
    .await?;

    let task_id = task_result.last_insert_rowid();

    if input.is_inbox.unwrap_or(false) {
        tx.commit().await?;
        return Ok(());
    }

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

    if input.is_urgent {
        let current_now: Option<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND status = 'NOW' LIMIT 1")
            .bind(input.workspace_id)
            .fetch_optional(&mut *tx)
            .await?;

        let urgent_duration = (input.hours * 60 + input.minutes) as i64;

        if let Some(block) = current_now {
            sqlx::query("UPDATE time_blocks SET end_time = ?1, status = 'PENDING' WHERE id = ?2")
                .bind(now_dt.format("%Y-%m-%dT%H:%M:00").to_string())
                .bind(block.id)
                .execute(&mut *tx)
                .await?;

            let original_end = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
            let remaining_duration = (original_end - now_dt).num_minutes();

            shift_future_blocks(&mut tx, input.workspace_id, original_end, urgent_duration).await?;
            schedule_task_blocks(&mut tx, input.workspace_id, task_id, &input.title, now_dt, urgent_duration, true, "NOW").await?;

            let urgent_end = now_dt + Duration::minutes(urgent_duration);

            if remaining_duration > 0 {
                schedule_task_blocks(&mut tx, input.workspace_id, block.task_id.unwrap(), &block.title, urgent_end, remaining_duration, block.is_urgent, "PENDING").await?;
            }
        } else {
            shift_future_blocks(&mut tx, input.workspace_id, now_dt, urgent_duration).await?;
            schedule_task_blocks(&mut tx, input.workspace_id, task_id, &input.title, now_dt, urgent_duration, true, "NOW").await?;
        }
    } else {
        schedule_task_blocks(&mut tx, input.workspace_id, task_id, &input.title, current_start, duration, false, "WILL").await?;
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
        let blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE task_id = ?1 ORDER BY start_time DESC")
            .bind(task_id)
            .fetch_all(&mut *tx)
            .await?;

        if !blocks.is_empty() {
            let workspace_id = blocks[0].workspace_id;
            for b in &blocks {
                if b.status == "DONE" { continue; }
                let start = NaiveDateTime::parse_from_str(&b.start_time, "%Y-%m-%dT%H:%M:%S").unwrap();
                let end = NaiveDateTime::parse_from_str(&b.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
                let duration = (end - start).num_minutes();
                shift_future_blocks(&mut tx, workspace_id, end, -duration).await?;
            }
            sqlx::query("DELETE FROM time_blocks WHERE task_id = ?1").bind(task_id).execute(&mut *tx).await?;
        }
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
    schedule_task_blocks(&mut tx, workspace_id, task_id, &task.title, current_start, duration, false, "WILL").await?;

    tx.commit().await?;
    Ok(())
}

pub async fn move_all_to_timeline(pool: &SqlitePool, workspace_id: i64) -> Result<()> {
    let mut tx = pool.begin().await?;
    let tasks = sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE workspace_id = ?1 AND id NOT IN (SELECT task_id FROM time_blocks WHERE task_id IS NOT NULL) ORDER BY position ASC, id ASC"
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
        schedule_task_blocks(&mut tx, workspace_id, task.id, &task.title, current_start, duration, false, "WILL").await?;
    }
    tx.commit().await?;
    Ok(())
}

pub async fn delete_task(pool: &SqlitePool, id: i64) -> Result<()> {
    let mut tx = pool.begin().await?;
    let blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE task_id = ?1 ORDER BY start_time DESC")
        .bind(id)
        .fetch_all(&mut *tx)
        .await?;

    if !blocks.is_empty() {
        let workspace_id = blocks[0].workspace_id;
        for b in &blocks {
            if b.status == "DONE" { continue; }
            let start = NaiveDateTime::parse_from_str(&b.start_time, "%Y-%m-%dT%H:%M:%S").unwrap();
            let end = NaiveDateTime::parse_from_str(&b.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
            let duration = (end - start).num_minutes();
            shift_future_blocks(&mut tx, workspace_id, end, -duration).await?;
        }
    }

    sqlx::query("DELETE FROM tasks WHERE id = ?1").bind(id).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(())
}

pub async fn handle_split_task_deletion(pool: &SqlitePool, task_id: i64, keep_past: bool) -> Result<()> {
    let mut tx = pool.begin().await?;
    if keep_past {
        let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = ?1").bind(task_id).fetch_one(&mut *tx).await?;
        sqlx::query("DELETE FROM time_blocks WHERE task_id = ?1 AND status = 'WILL'").bind(task_id).execute(&mut *tx).await?;
        let blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE task_id = ?1").bind(task_id).fetch_all(&mut *tx).await?;

        for block in blocks {
            let result = sqlx::query("INSERT INTO tasks (workspace_id, title, planning_memo, estimated_minutes) VALUES (?1, ?2, ?3, ?4)")
                .bind(task.workspace_id).bind(&task.title).bind(&task.planning_memo).bind(0).execute(&mut *tx).await?;
            let new_task_id = result.last_insert_rowid();
            sqlx::query("UPDATE time_blocks SET task_id = ?1, status = 'DONE' WHERE id = ?2").bind(new_task_id).bind(block.id).execute(&mut *tx).await?;
        }
        sqlx::query("DELETE FROM tasks WHERE id = ?1").bind(task_id).execute(&mut *tx).await?;
    } else {
        let blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE task_id = ?1 ORDER BY start_time DESC")
            .bind(task_id).fetch_all(&mut *tx).await?;

        if !blocks.is_empty() {
            let workspace_id = blocks[0].workspace_id;
            for b in &blocks {
                if b.status == "DONE" { continue; }
                let start = NaiveDateTime::parse_from_str(&b.start_time, "%Y-%m-%dT%H:%M:%S").unwrap();
                let end = NaiveDateTime::parse_from_str(&b.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
                let duration = (end - start).num_minutes();
                shift_future_blocks(&mut tx, workspace_id, end, -duration).await?;
            }
        }
        sqlx::query("DELETE FROM tasks WHERE id = ?1").bind(task_id).execute(&mut *tx).await?;
    }
    tx.commit().await?;
    Ok(())
}

pub async fn process_task_transition(pool: &SqlitePool, input: TaskTransitionInput) -> Result<()> {
    let mut tx = pool.begin().await?;
    let block: TimeBlock = sqlx::query_as("SELECT * FROM time_blocks WHERE id = ?1").bind(input.block_id).fetch_one(&mut *tx).await?;

    if let Some(task_id) = block.task_id {
        let first_incomplete: (Option<i64>,) = sqlx::query_as("SELECT MIN(id) FROM time_blocks WHERE task_id = ?1 AND status != 'DONE'").bind(task_id).fetch_one(&mut *tx).await?;
        if let Some(fid) = first_incomplete.0 {
            if fid != input.block_id {
                return Err(AppError::InvalidInput("Only the first active block of a split task can be transitioned.".to_string()));
            }
        } else {
            let last_id: (i64,) = sqlx::query_as("SELECT MAX(id) FROM time_blocks WHERE task_id = ?1").bind(task_id).fetch_one(&mut *tx).await?;
            if last_id.0 != input.block_id {
                return Err(AppError::InvalidInput("Only the last block of a completed split task can be modified.".to_string()));
            }
        }
    }

    match input.action.as_str() {
        "COMPLETE_ON_TIME" | "COMPLETE_NOW" | "COMPLETE_AGO" => {
            let end_dt = if input.action == "COMPLETE_NOW" {
                Local::now().naive_local()
            } else if input.action == "COMPLETE_AGO" {
                Local::now().naive_local() - Duration::minutes(input.extra_minutes.unwrap_or(0) as i64)
            } else {
                NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap()
            };

            let end_dt = NaiveDateTime::new(end_dt.date(), NaiveTime::from_hms_opt(end_dt.hour(), end_dt.minute(), 0).unwrap());

            if let Some(task_id) = block.task_id {
                sqlx::query("UPDATE time_blocks SET status = 'DONE' WHERE task_id = ?1").bind(task_id).execute(&mut *tx).await?;
            }

            sqlx::query("UPDATE time_blocks SET status = 'DONE', end_time = ?1, review_memo = ?2 WHERE id = ?3")
                .bind(end_dt.format("%Y-%m-%dT%H:%M:00").to_string()).bind(input.review_memo).bind(input.block_id).execute(&mut *tx).await?;

            let next_block: Option<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND status IN ('WILL', 'PENDING') AND id != ?2 AND start_time >= ?3 ORDER BY start_time ASC LIMIT 1")
                .bind(block.workspace_id).bind(input.block_id).bind(&block.start_time).fetch_optional(&mut *tx).await?;

            if let Some(nb) = next_block {
                let nb_start = NaiveDateTime::parse_from_str(&nb.start_time, "%Y-%m-%dT%H:%M:%S").unwrap();
                let diff = (end_dt - nb_start).num_minutes();
                if diff != 0 { shift_future_blocks(&mut tx, block.workspace_id, nb_start, diff).await?; }
                sqlx::query("UPDATE time_blocks SET status = 'NOW' WHERE id = ?1").bind(nb.id).execute(&mut *tx).await?;
                if let Some(tid) = nb.task_id {
                    sqlx::query("UPDATE time_blocks SET status = 'CONTINUED' WHERE task_id = ?1 AND status = 'PENDING' AND id < ?2").bind(tid).bind(nb.id).execute(&mut *tx).await?;
                }
            }
        },
        "DELAY" => {
            let extra = input.extra_minutes.unwrap_or(0) as i64;
            let current_end = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
            let new_end = current_end + Duration::minutes(extra);
            sqlx::query("UPDATE time_blocks SET end_time = ?1 WHERE id = ?2").bind(new_end.format("%Y-%m-%dT%H:%M:00").to_string()).bind(input.block_id).execute(&mut *tx).await?;
            shift_future_blocks(&mut tx, block.workspace_id, current_end, extra).await?;
        },
        _ => return Err(AppError::InvalidInput("Invalid action".to_string())),
    }
    tx.commit().await?;
    Ok(())
}

pub async fn update_block_status(pool: &SqlitePool, block_id: i64, status: String) -> Result<()> {
    let mut tx = pool.begin().await?;
    let block: TimeBlock = sqlx::query_as("SELECT * FROM time_blocks WHERE id = ?1").bind(block_id).fetch_one(&mut *tx).await?;

    if let Some(task_id) = block.task_id {
        let first_active: (Option<i64>,) = sqlx::query_as("SELECT MIN(id) FROM time_blocks WHERE task_id = ?1 AND status NOT IN ('DONE', 'PENDING', 'CONTINUED')").bind(task_id).fetch_one(&mut *tx).await?;
        if let Some(fid) = first_active.0 {
            if fid != block_id {
                return Err(AppError::InvalidInput("Only the first active block (WILL) of a split task can be modified.".to_string()));
            }
        } else {
            let last_id: (i64,) = sqlx::query_as("SELECT MAX(id) FROM time_blocks WHERE task_id = ?1").bind(task_id).fetch_one(&mut *tx).await?;
            if last_id.0 != block_id {
                return Err(AppError::InvalidInput("Only the last block of a split task can be modified when no future blocks exist.".to_string()));
            }
        }
    }

    sqlx::query("UPDATE time_blocks SET status = ?1 WHERE id = ?2").bind(&status).bind(block_id).execute(&mut *tx).await?;
    if status == "NOW" {
        if let Some(task_id) = block.task_id {
            sqlx::query("UPDATE time_blocks SET status = 'CONTINUED' WHERE task_id = ?1 AND status = 'PENDING' AND id < ?2").bind(task_id).bind(block_id).execute(&mut *tx).await?;
        }
    }
    tx.commit().await?;
    Ok(())
}

pub async fn reorder_blocks(pool: &SqlitePool, workspace_id: i64, block_ids: Vec<i64>) -> Result<()> {
    let mut tx = pool.begin().await?;
    reorder_internal(&mut tx, workspace_id, block_ids).await?;
    tx.commit().await?;
    Ok(())
}

pub async fn reorder_inbox(pool: &SqlitePool, workspace_id: i64, task_ids: Vec<i64>) -> Result<()> {
    let mut tx = pool.begin().await?;
    for (i, &task_id) in task_ids.iter().enumerate() {
        sqlx::query("UPDATE tasks SET position = ?1 WHERE id = ?2 AND workspace_id = ?3").bind(i as i64).bind(task_id).bind(workspace_id).execute(&mut *tx).await?;
    }
    tx.commit().await?;
    Ok(())
}

pub async fn move_task_step(pool: &SqlitePool, workspace_id: i64, block_id: i64, direction: String) -> Result<()> {
    let mut tx = pool.begin().await?;
    let all_blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND status != 'DONE' ORDER BY start_time ASC").bind(workspace_id).fetch_all(&mut *tx).await?;
    if all_blocks.is_empty() { return Ok(()); }
    let mut ids: Vec<i64> = all_blocks.iter().map(|b| b.id).collect();
    let index = ids.iter().position(|&id| id == block_id).ok_or_else(|| AppError::NotFound("Block not found".to_string()))?;
    if direction == "up" { if index > 0 { ids.swap(index, index - 1); } } else if direction == "down" { if index < ids.len() - 1 { ids.swap(index, index + 1); } }
    reorder_internal(&mut tx, workspace_id, ids).await?;
    tx.commit().await?;
    Ok(())
}

pub async fn move_task_to_priority(pool: &SqlitePool, workspace_id: i64, block_id: i64) -> Result<()> {
    let mut tx = pool.begin().await?;
    let all_blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND status != 'DONE' ORDER BY start_time ASC").bind(workspace_id).fetch_all(&mut *tx).await?;
    if all_blocks.is_empty() { return Ok(()); }
    let mut ids: Vec<i64> = all_blocks.iter().map(|b| b.id).collect();
    let index = ids.iter().position(|&id| id == block_id).ok_or_else(|| AppError::NotFound("Block not found".to_string()))?;
    let target_id = ids.remove(index);
    let now_pos = all_blocks.iter().position(|b| b.status == "NOW");
    let new_pos = if let Some(n_idx) = now_pos { let now_id = all_blocks[n_idx].id; ids.iter().position(|&id| id == now_id).map(|p| p + 1).unwrap_or(0) } else { 0 };
    ids.insert(new_pos, target_id);
    reorder_internal(&mut tx, workspace_id, ids).await?;
    tx.commit().await?;
    Ok(())
}

pub async fn move_task_to_bottom(pool: &SqlitePool, workspace_id: i64, block_id: i64) -> Result<()> {
    let mut tx = pool.begin().await?;
    let all_blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND status != 'DONE' ORDER BY start_time ASC").bind(workspace_id).fetch_all(&mut *tx).await?;
    if all_blocks.is_empty() { return Ok(()); }
    let mut ids: Vec<i64> = all_blocks.iter().map(|b| b.id).collect();
    let index = ids.iter().position(|&id| id == block_id).ok_or_else(|| AppError::NotFound("Block not found".to_string()))?;
    let target_id = ids.remove(index);
    ids.push(target_id);
    reorder_internal(&mut tx, workspace_id, ids).await?;
    tx.commit().await?;
    Ok(())
}

async fn reorder_internal(tx: &mut Transaction<'_, Sqlite>, workspace_id: i64, block_ids: Vec<i64>) -> Result<()> {
    let all_blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND status != 'DONE'").bind(workspace_id).fetch_all(&mut **tx).await?;
    if all_blocks.is_empty() { return Ok(()); }
    if let Some(now_block) = all_blocks.iter().find(|b| b.status == "NOW") {
        if let Some(pos) = block_ids.iter().position(|&id| id == now_block.id) {
            for &id in &block_ids[..pos] {
                if let Some(prev_block) = all_blocks.iter().find(|b| b.id == id) {
                    if prev_block.status == "WILL" || (prev_block.status == "PENDING" && prev_block.start_time >= now_block.start_time) {
                        return Err(AppError::InvalidInput("Cannot move tasks before the active task".to_string()));
                    }
                }
            }
        }
    }
    let mut current_blocks: Vec<TimeBlock> = all_blocks.clone();
    current_blocks.sort_by(|a, b| a.start_time.cmp(&b.start_time));
    let start_dt = NaiveDateTime::parse_from_str(&current_blocks[0].start_time, "%Y-%m-%dT%H:%M:%S").unwrap();
    let mut current_time = start_dt;
    let unplugged: Vec<UnpluggedTime> = sqlx::query_as("SELECT * FROM unplugged_times WHERE workspace_id = ?1").bind(workspace_id).fetch_all(&mut **tx).await?;

    for id in block_ids {
        if let Some(block) = all_blocks.iter().find(|b| b.id == id).cloned() {
            let start_val = NaiveDateTime::parse_from_str(&block.start_time, "%Y-%m-%dT%H:%M:%S").unwrap();
            let end_val = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
            let duration_min = (end_val - start_val).num_minutes();
            let mut shifted = true;
            while shifted {
                shifted = false;
                for ut in &unplugged {
                    let ut_start = current_time.date().and_time(NaiveTime::parse_from_str(&ut.start_time, "%H:%M").unwrap());
                    let mut ut_end = current_time.date().and_time(NaiveTime::parse_from_str(&ut.end_time, "%H:%M").unwrap());
                    if ut_end < ut_start { ut_end += Duration::days(1); }
                    if current_time >= ut_start && current_time < ut_end { current_time = ut_end; shifted = true; }
                }
            }
            let new_end = current_time + Duration::minutes(duration_min);
            sqlx::query("UPDATE time_blocks SET start_time = ?1, end_time = ?2 WHERE id = ?3")
                .bind(current_time.format("%Y-%m-%dT%H:%M:00").to_string()).bind(new_end.format("%Y-%m-%dT%H:%M:00").to_string()).bind(block.id).execute(&mut **tx).await?;
            current_time = new_end;
        }
    }
    Ok(())
}

async fn schedule_task_blocks(tx: &mut Transaction<'_, Sqlite>, workspace_id: i64, task_id: i64, title: &str, start_dt: NaiveDateTime, mut remaining_minutes: i64, is_urgent: bool, status: &str) -> Result<()> {
    let mut current_start = start_dt;
    let mut first = true;
    let unplugged: Vec<UnpluggedTime> = sqlx::query_as("SELECT * FROM unplugged_times WHERE workspace_id = ?1").bind(workspace_id).fetch_all(&mut **tx).await?;

    while remaining_minutes > 0 {
        let current_end = current_start + Duration::minutes(remaining_minutes);
        let mut split_at = None;
        let mut resume_at = None;

        for ut in &unplugged {
            let ut_start = current_start.date().and_time(NaiveTime::parse_from_str(&ut.start_time, "%H:%M").unwrap());
            let ut_end = current_start.date().and_time(NaiveTime::parse_from_str(&ut.end_time, "%H:%M").unwrap());
            if current_start < ut_start && current_end > ut_start { split_at = Some(ut_start); resume_at = Some(ut_end); break; }
            if current_start >= ut_start && current_start < ut_end { current_start = ut_end; continue; }
        }

        let end = split_at.unwrap_or(current_end);
        let duration = (end - current_start).num_minutes();
        if duration > 0 {
            let block_status = if first { status } else { "WILL" };
            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status, is_urgent) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
                .bind(task_id).bind(workspace_id).bind(title).bind(current_start.format("%Y-%m-%dT%H:%M:00").to_string()).bind(end.format("%Y-%m-%dT%H:%M:00").to_string()).bind(block_status).bind(is_urgent).execute(&mut **tx).await?;
            first = false;
        }
        remaining_minutes -= duration;
        if let Some(r) = resume_at { current_start = r; } else { break; }
    }
    Ok(())
}

async fn shift_future_blocks(tx: &mut Transaction<'_, Sqlite>, workspace_id: i64, after_dt: NaiveDateTime, shift_minutes: i64) -> Result<()> {
    let blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND start_time >= ?2 AND status IN ('WILL', 'PENDING')")
        .bind(workspace_id).bind(after_dt.format("%Y-%m-%dT%H:%M:00").to_string()).fetch_all(&mut **tx).await?;

    for block in blocks {
        let new_start = NaiveDateTime::parse_from_str(&block.start_time, "%Y-%m-%dT%H:%M:%S").unwrap() + Duration::minutes(shift_minutes);
        let new_end = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap() + Duration::minutes(shift_minutes);
        sqlx::query("UPDATE time_blocks SET start_time = ?1, end_time = ?2 WHERE id = ?3").bind(new_start.format("%Y-%m-%dT%H:%M:00").to_string()).bind(new_end.format("%Y-%m-%dT%H:%M:00").to_string()).bind(block.id).execute(&mut **tx).await?;
    }
    Ok(())
}

pub async fn get_active_dates(pool: &SqlitePool, workspace_id: i64) -> Result<Vec<String>> {
    database::timeline::get_active_dates(pool, workspace_id).await
}

pub async fn update_task(pool: &SqlitePool, input: UpdateTaskInput) -> Result<()> {
    let mut tx = pool.begin().await?;
    let block: TimeBlock = sqlx::query_as("SELECT * FROM time_blocks WHERE id = ?1").bind(input.block_id).fetch_one(&mut *tx).await?;

    if let Some(task_id) = block.task_id {
        let mut project_id = None;
        if let Some(p_name) = &input.project_name {
            if !p_name.trim().is_empty() {
                let existing: Option<(i64,)> = sqlx::query_as("SELECT id FROM projects WHERE name = ?1").bind(p_name).fetch_optional(&mut *tx).await?;
                if let Some((id,)) = existing { project_id = Some(id); sqlx::query("UPDATE projects SET last_used = ?1 WHERE id = ?2").bind(Local::now().format("%Y-%m-%dT%H:%M:00").to_string()).bind(id).execute(&mut *tx).await?; }
                else { let res = sqlx::query("INSERT INTO projects (name, last_used) VALUES (?1, ?2)").bind(p_name).bind(Local::now().format("%Y-%m-%dT%H:%M:00").to_string()).execute(&mut *tx).await?; project_id = Some(res.last_insert_rowid()); }
            }
        }
        let mut label_id = None;
        if let Some(l_name) = &input.label_name {
            if !l_name.trim().is_empty() {
                let existing: Option<(i64,)> = sqlx::query_as("SELECT id FROM labels WHERE name = ?1").bind(l_name).fetch_optional(&mut *tx).await?;
                if let Some((id,)) = existing { label_id = Some(id); sqlx::query("UPDATE labels SET last_used = ?1 WHERE id = ?2").bind(Local::now().format("%Y-%m-%dT%H:%M:00").to_string()).bind(id).execute(&mut *tx).await?; }
                else { let res = sqlx::query("INSERT INTO labels (name, color, last_used) VALUES (?1, '#808080', ?2)").bind(l_name).bind(Local::now().format("%Y-%m-%dT%H:%M:00").to_string()).execute(&mut *tx).await?; label_id = Some(res.last_insert_rowid()); }
            }
        }
        sqlx::query("UPDATE tasks SET title = ?1, planning_memo = ?2, project_id = ?3, label_id = ?4 WHERE id = ?5").bind(&input.title).bind(&input.description).bind(project_id).bind(label_id).bind(task_id).execute(&mut *tx).await?;
        sqlx::query("UPDATE time_blocks SET title = ?1 WHERE task_id = ?2").bind(&input.title).bind(task_id).execute(&mut *tx).await?;
    }

    if block.status == "DONE" { sqlx::query("UPDATE time_blocks SET review_memo = ?1 WHERE id = ?2").bind(input.review_memo).bind(input.block_id).execute(&mut *tx).await?; }
    else {
        let start_dt = NaiveDateTime::parse_from_str(&block.start_time, "%Y-%m-%dT%H:%M:%S").unwrap();
        let original_end_dt = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
        let original_duration = (original_end_dt - start_dt).num_minutes();
        let new_duration = (input.hours * 60 + input.minutes) as i64;
        let diff = new_duration - original_duration;
        let new_end_dt = start_dt + Duration::minutes(new_duration);
        sqlx::query("UPDATE time_blocks SET end_time = ?1 WHERE id = ?2").bind(new_end_dt.format("%Y-%m-%dT%H:%M:00").to_string()).bind(input.block_id).execute(&mut *tx).await?;
        if diff != 0 { shift_future_blocks(&mut tx, block.workspace_id, original_end_dt, diff).await?; }
    }
    tx.commit().await?;
    Ok(())
}

pub async fn get_greeting(pool: &SqlitePool, workspace_id: i64, lang: String) -> Result<String> {
    let user = database::user::get_user(pool).await?.ok_or_else(|| AppError::NotFound("User not found".to_string()))?;
    let now = Local::now();
    let hour = now.hour();
    let is_active = database::timeline::check_active_block_exists(pool, workspace_id).await?;
    let nickname = user.nickname;
    let is_ko = lang == "ko";

    let greeting = match hour {
        6..11 => if is_active { if is_ko { format!("{}, 아침 집중력이 대단하시네요! 계획대로 잘 되고 있나요?", nickname) } else { format!("{}, great focus this morning! Is everything on track?", nickname) } } else { if is_ko { format!("좋은 아침입니다, {}. 활기찬 하루를 계획해볼까요?", nickname) } else { format!("Good morning, {}. Let's plan an energetic day!", nickname) } },
        11..13 => if is_active { if is_ko { format!("곧 점심시간이네요. 진행 중인 업무를 잘 마무리하고 계신가요?") } else { format!("Lunchtime is approaching. Are you wrapping up your current task?") } } else { if is_ko { format!("오전 업무 수고하셨습니다. 식사 후 오후 계획을 세워볼까요?") } else { format!("Great work this morning. Shall we plan the afternoon after eating?") } },
        13..18 => if is_active { if is_ko { format!("오후에도 몰입을 유지해봐요. 지금 하는 일에 집중!") } else { format!("Keep it up! Maintain the momentum on your current task.") } } else { if is_ko { format!("나른한 오후네요. 남은 하루를 위한 목표를 세워보죠.") } else { format!("Lazy afternoon. Let's set a goal for the rest of the day.") } },
        18..22 => if is_active { if is_ko { format!("늦은 시간까지 열정이 넘치시네요. 무리하지 마세요!") } else { format!("Working late. Pace yourself and don't overdo it.") } } else { if is_ko { format!("퇴근 시간이 지났네요. 내일을 위해 가볍게 정리해볼까요?") } else { format!("Past clock-out time. Shall we organize for tomorrow?") } },
        22..24 | 0..4 => if is_active { if is_ko { format!("밤샘 작업 중이시군요! 이번 작업 후엔 꼭 휴식하세요.") } else { format!("Working the night shift! Please take a rest after this.") } } else { if is_ko { format!("오늘 하루 고생 많으셨습니다. 평온한 밤 되세요.") } else { format!("Great job today. Have a peaceful night.") } },
        4..6 => if is_active { if is_ko { format!("벌써 시작하셨나요? 기록하는 걸 잊지 마세요.") } else { format!("An early start! Don't forget to log your progress.") } } else { if is_ko { format!("이른 새벽이네요. 고요한 시간에 어떤 계획을 세워볼까요?") } else { format!("Early dawn. What plan will you make in this quiet time?") } },
        _ => if is_ko { format!("안녕하세요, {}님!", nickname) } else { format!("Hello, {}!", nickname) },
    };
    Ok(greeting)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;
    use crate::domain::AddTaskInput;

    async fn setup_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .expect("Failed to connect to memory db");

        sqlx::query("CREATE TABLE workspaces (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, core_time_start TEXT, core_time_end TEXT, role_intro TEXT)").execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE unplugged_times (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, label TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL)").execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, last_used TEXT NOT NULL)").execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE labels (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT NOT NULL, last_used TEXT NOT NULL)").execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, planning_memo TEXT, estimated_minutes INTEGER NOT NULL DEFAULT 0, project_id INTEGER REFERENCES projects(id), label_id INTEGER REFERENCES labels(id), position INTEGER NOT NULL DEFAULT 0)").execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE time_blocks (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, status TEXT NOT NULL, review_memo TEXT, planning_memo TEXT, is_urgent BOOLEAN NOT NULL DEFAULT 0)").execute(&pool).await.unwrap();

        pool
    }

    #[tokio::test]
    async fn test_urgent_task_time_shift() {
        let pool = setup_db().await;
        
        sqlx::query("INSERT INTO workspaces (id, name) VALUES (1, 'Test')").execute(&pool).await.unwrap();

        let t1_start = "2026-03-01T18:00:00";
        let t1_end = "2026-03-01T18:30:00";
        sqlx::query("INSERT INTO tasks (id, workspace_id, title) VALUES (10, 1, 'T1')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (10, 1, 'T1', ?1, ?2, 'NOW')")
            .bind(t1_start).bind(t1_end).execute(&pool).await.unwrap();

        let t3_start = "2026-03-01T18:30:00";
        let t3_end = "2026-03-01T19:00:00";
        sqlx::query("INSERT INTO tasks (id, workspace_id, title) VALUES (11, 1, 'T3')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (11, 1, 'T3', ?1, ?2, 'WILL')")
            .bind(t3_start).bind(t3_end).execute(&pool).await.unwrap();

        let now_dt = NaiveDateTime::parse_from_str("2026-03-01T18:10:00", "%Y-%m-%dT%H:%M:%S").unwrap();
        let input = AddTaskInput {
            workspace_id: 1,
            title: "T2 (Urgent)".to_string(),
            planning_memo: None,
            hours: 0,
            minutes: 20,
            is_urgent: true,
            is_inbox: Some(false),
            project_name: None,
            label_name: None,
        };

        add_task_at(&pool, input, now_dt).await.unwrap();

        let blocks = database::timeline::get_timeline(&pool, 1, NaiveDate::from_ymd_opt(2026, 3, 1).unwrap(), "04:00").await.unwrap();
        
        assert_eq!(blocks.len(), 4);
        assert_eq!(blocks[0].title, "T1");
        assert_eq!(blocks[0].status, "PENDING");
        assert_eq!(blocks[1].title, "T2 (Urgent)");
        assert_eq!(blocks[1].status, "NOW");
        assert_eq!(blocks[2].title, "T1");
        assert_eq!(blocks[2].status, "PENDING");
        assert_eq!(blocks[3].title, "T3");
        assert_eq!(blocks[3].status, "WILL");
    }

    #[tokio::test]
    async fn test_handle_split_task_deletion_keep_past() {
        let pool = setup_db().await;
        
        sqlx::query("INSERT INTO workspaces (id, name) VALUES (1, 'Test')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (id, workspace_id, title) VALUES (10, 1, 'Split Task')").execute(&pool).await.unwrap();

        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (101, 10, 1, 'Split Task', '2026-03-01T09:00:00', '2026-03-01T10:00:00', 'PENDING')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (102, 10, 1, 'Split Task', '2026-03-01T10:00:00', '2026-03-01T11:00:00', 'NOW')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (103, 10, 1, 'Split Task', '2026-03-01T11:00:00', '2026-03-01T12:00:00', 'WILL')").execute(&pool).await.unwrap();

        handle_split_task_deletion(&pool, 10, true).await.unwrap();

        let task_exists = sqlx::query("SELECT 1 FROM tasks WHERE id = 10").fetch_optional(&pool).await.unwrap();
        assert!(task_exists.is_none());

        let block_103_exists = sqlx::query("SELECT 1 FROM time_blocks WHERE id = 103").fetch_optional(&pool).await.unwrap();
        assert!(block_103_exists.is_none());

        let block_101: TimeBlock = sqlx::query_as("SELECT * FROM time_blocks WHERE id = 101").fetch_one(&pool).await.unwrap();
        let block_102: TimeBlock = sqlx::query_as("SELECT * FROM time_blocks WHERE id = 102").fetch_one(&pool).await.unwrap();
        
        assert_eq!(block_101.status, "DONE");
        assert_eq!(block_102.status, "DONE");
    }

    #[tokio::test]
    async fn test_move_to_inbox_pull_up() {
        let pool = setup_db().await;
        sqlx::query("INSERT INTO workspaces (id, name) VALUES (1, 'Test')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (id, workspace_id, title) VALUES (1, 1, 'T1')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (id, workspace_id, title) VALUES (2, 1, 'T2')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (id, workspace_id, title) VALUES (3, 1, 'T3')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (10, 1, 1, 'T1', '2026-03-01T09:00:00', '2026-03-01T10:00:00', 'DONE')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (11, 2, 1, 'T2', '2026-03-01T10:00:00', '2026-03-01T11:00:00', 'WILL')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (12, 3, 1, 'T3', '2026-03-01T11:00:00', '2026-03-01T12:00:00', 'WILL')").execute(&pool).await.unwrap();
        move_to_inbox(&pool, 11).await.unwrap();
        let t3_block: TimeBlock = sqlx::query_as("SELECT * FROM time_blocks WHERE id = 12").fetch_one(&pool).await.unwrap();
        assert_eq!(t3_block.start_time, "2026-03-01T10:00:00");
        assert_eq!(t3_block.end_time, "2026-03-01T11:00:00");
    }

    #[tokio::test]
    async fn test_update_task_time_shift() {
        let pool = setup_db().await;
        sqlx::query("INSERT INTO workspaces (id, name) VALUES (1, 'Test')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (id, workspace_id, title) VALUES (1, 1, 'Task A')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (id, workspace_id, title) VALUES (2, 1, 'Task B')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (10, 1, 1, 'Task A', '2026-03-01T09:00:00', '2026-03-01T09:30:00', 'NOW')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (11, 2, 1, 'Task B', '2026-03-01T09:30:00', '2026-03-01T10:30:00', 'WILL')").execute(&pool).await.unwrap();
        let input = UpdateTaskInput {
            block_id: 10,
            title: "Task A Updated".to_string(),
            description: Some("New desc".to_string()),
            hours: 1,
            minutes: 0,
            review_memo: None,
            project_name: None,
            label_name: None,
        };
        update_task(&pool, input).await.unwrap();
        let block_a: TimeBlock = sqlx::query_as("SELECT * FROM time_blocks WHERE id = 10").fetch_one(&pool).await.unwrap();
        let block_b: TimeBlock = sqlx::query_as("SELECT * FROM time_blocks WHERE id = 11").fetch_one(&pool).await.unwrap();
        assert_eq!(block_a.title, "Task A Updated");
        assert_eq!(block_a.end_time, "2026-03-01T10:00:00");
        assert_eq!(block_b.start_time, "2026-03-01T10:00:00");
    }

    #[tokio::test]
    async fn test_split_task_transition_order() {
        let pool = setup_db().await;
        sqlx::query("INSERT INTO workspaces (id, name) VALUES (1, 'Test')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (id, workspace_id, title) VALUES (1, 1, 'Task Split')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (10, 1, 1, 'Task Split', '2026-03-01T09:00:00', '2026-03-01T09:30:00', 'WILL')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (11, 1, 1, 'Task Split', '2026-03-01T10:00:00', '2026-03-01T10:30:00', 'WILL')").execute(&pool).await.unwrap();
        let result = update_block_status(&pool, 11, "NOW".to_string()).await;
        assert!(result.is_err());
        update_block_status(&pool, 10, "NOW".to_string()).await.unwrap();
        let transition_input = TaskTransitionInput {
            block_id: 10,
            action: "COMPLETE_ON_TIME".to_string(),
            extra_minutes: None,
            review_memo: None,
        };
        process_task_transition(&pool, transition_input).await.unwrap();
        let result = update_block_status(&pool, 11, "NOW".to_string()).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_reorder_logic_priority_jump() {
        let pool = setup_db().await;
        sqlx::query("INSERT INTO workspaces (id, name) VALUES (1, 'Test')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (id, workspace_id, title) VALUES (1, 1, 'T1')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (id, workspace_id, title) VALUES (2, 1, 'T2')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (id, workspace_id, title) VALUES (3, 1, 'T3')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (10, 1, 1, 'T1', '2026-03-01T09:00:00', '2026-03-01T10:00:00', 'NOW')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (11, 2, 1, 'T2', '2026-03-01T10:00:00', '2026-03-01T11:00:00', 'WILL')").execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO time_blocks (id, task_id, workspace_id, title, start_time, end_time, status) VALUES (12, 3, 1, 'T3', '2026-03-01T11:00:00', '2026-03-01T12:00:00', 'WILL')").execute(&pool).await.unwrap();
        move_task_to_priority(&pool, 1, 12).await.unwrap();
        let blocks = database::timeline::get_timeline(&pool, 1, NaiveDate::from_ymd_opt(2026, 3, 1).unwrap(), "04:00").await.unwrap();
        assert_eq!(blocks[1].id, 12);
        assert_eq!(blocks[2].id, 11);
        assert_eq!(blocks[1].start_time, "2026-03-01T10:00:00");
    }
}
