use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePool, Pool, Sqlite, Row};
use std::fs;
use tauri::{Manager, State};
use chrono::{Local, NaiveDateTime, NaiveTime, Duration, Timelike, NaiveDate};

// --- Entities ---

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
pub struct User {
    pub id: i64,
    pub nickname: String,
    pub gemini_api_key: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
pub struct Workspace {
    pub id: i64,
    pub name: String,
    pub core_time_start: Option<String>,
    pub core_time_end: Option<String>,
    pub role_intro: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
pub struct UnpluggedTime {
    pub id: i64,
    pub workspace_id: i64,
    pub label: String,
    pub start_time: String,
    pub end_time: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
pub struct Task {
    pub id: i64,
    pub workspace_id: i64,
    pub title: String,
    pub planning_memo: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
pub struct TimeBlock {
    pub id: i64,
    pub task_id: Option<i64>,
    pub workspace_id: i64,
    pub title: String,
    pub start_time: String,
    pub end_time: String,
    pub status: String, // DONE, NOW, WILL, UNPLUGGED, PENDING
    pub review_memo: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AddTaskInput {
    pub workspace_id: i64,
    pub title: String,
    pub hours: i32,
    pub minutes: i32,
    pub planning_memo: Option<String>,
    pub is_urgent: bool,
    pub is_inbox: Option<bool>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TaskTransitionInput {
    pub block_id: i64,
    pub action: String, // COMPLETE, DELAY, FORGOT
    pub extra_minutes: Option<i32>,
    pub review_memo: Option<String>,
}

pub struct DbState {
    pub pool: Pool<Sqlite>,
}

// --- Commands ---

#[tauri::command]
async fn get_user(state: State<'_, DbState>) -> Result<Option<User>, String> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = 1")
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(user)
}

#[tauri::command]
async fn save_user(
    state: State<'_, DbState>,
    nickname: String,
    gemini_api_key: Option<String>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO users (id, nickname, gemini_api_key) 
         VALUES (1, ?1, ?2) 
         ON CONFLICT(id) DO UPDATE SET nickname=?1, gemini_api_key=?2",
    )
    .bind(nickname)
    .bind(gemini_api_key)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn check_user_exists(state: State<'_, DbState>) -> Result<bool, String> {
    let result = sqlx::query("SELECT 1 FROM users WHERE id = 1")
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(result.is_some())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CreateWorkspaceInput {
    pub name: String,
    pub core_time_start: Option<String>,
    pub core_time_end: Option<String>,
    pub role_intro: Option<String>,
    pub unplugged_times: Vec<UnpluggedTimeInput>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UnpluggedTimeInput {
    pub label: String,
    pub start_time: String,
    pub end_time: String,
}

#[tauri::command]
async fn create_workspace(
    state: State<'_, DbState>,
    input: CreateWorkspaceInput,
) -> Result<i64, String> {
    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;
    let result = sqlx::query(
        "INSERT INTO workspaces (name, core_time_start, core_time_end, role_intro) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(&input.name)
    .bind(&input.core_time_start)
    .bind(&input.core_time_end)
    .bind(&input.role_intro)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let workspace_id = result.last_insert_rowid();

    for ut in input.unplugged_times {
        sqlx::query(
            "INSERT INTO unplugged_times (workspace_id, label, start_time, end_time) VALUES (?1, ?2, ?3, ?4)",
        )
        .bind(workspace_id)
        .bind(ut.label)
        .bind(ut.start_time)
        .bind(ut.end_time)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(workspace_id)
}

#[tauri::command]
async fn get_workspaces(state: State<'_, DbState>) -> Result<Vec<Workspace>, String> {
    let workspaces = sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces")
        .fetch_all(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(workspaces)
}

#[tauri::command]
async fn get_workspace(state: State<'_, DbState>, id: i64) -> Result<Option<Workspace>, String> {
    let ws = sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces WHERE id = ?1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(ws)
}

#[tauri::command]
async fn get_unplugged_times(state: State<'_, DbState>, workspace_id: i64) -> Result<Vec<UnpluggedTime>, String> {
    let list = sqlx::query_as::<_, UnpluggedTime>("SELECT * FROM unplugged_times WHERE workspace_id = ?1")
        .bind(workspace_id)
        .fetch_all(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(list)
}

#[tauri::command]
async fn update_workspace(
    state: State<'_, DbState>,
    id: i64,
    input: CreateWorkspaceInput,
) -> Result<(), String> {
    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;
    sqlx::query(
        "UPDATE workspaces SET name=?1, core_time_start=?2, core_time_end=?3, role_intro=?4 WHERE id=?5",
    )
    .bind(&input.name)
    .bind(&input.core_time_start)
    .bind(&input.core_time_end)
    .bind(&input.role_intro)
    .bind(id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM unplugged_times WHERE workspace_id = ?1")
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    for ut in input.unplugged_times {
        sqlx::query(
            "INSERT INTO unplugged_times (workspace_id, label, start_time, end_time) VALUES (?1, ?2, ?3, ?4)",
        )
        .bind(id)
        .bind(ut.label)
        .bind(ut.start_time)
        .bind(ut.end_time)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_greeting(state: State<'_, DbState>, workspace_id: i64, lang: String) -> Result<String, String> {
    let user = get_user(state.clone()).await?.ok_or("User not found")?;
    let now = Local::now();
    let hour = now.hour();

    let active_block = sqlx::query("SELECT 1 FROM time_blocks WHERE workspace_id = ?1 AND status = 'NOW'")
        .bind(workspace_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    
    let is_active = active_block.is_some();
    let nickname = user.nickname;
    let is_ko = lang == "ko";

    let greeting = match hour {
        6..11 => if is_active { 
            if is_ko { format!("{}, 아침 집중력이 대단하시네요! 계획대로 잘 되고 있나요?", nickname) }
            else { format!("{}, great focus this morning! Is everything on track?", nickname) }
        } else { 
            if is_ko { format!("좋은 아침입니다, {}. 활기찬 하루를 계획해볼까요?", nickname) }
            else { format!("Good morning, {}. Let's plan an energetic day!", nickname) }
        },
        11..13 => if is_active { 
            if is_ko { format!("곧 점심시간이네요. 진행 중인 업무를 잘 마무리하고 계신가요?") }
            else { format!("Lunchtime is approaching. Are you wrapping up your current task?") }
        } else { 
            if is_ko { format!("오전 업무 수고하셨습니다. 식사 후 오후 계획을 세워볼까요?") }
            else { format!("Great work this morning. Shall we plan the afternoon after eating?") }
        },
        13..18 => if is_active { 
            if is_ko { format!("오후에도 몰입을 유지해봐요. 지금 하는 일에 집중!") }
            else { format!("Keep it up! Maintain the momentum on your current task.") }
        } else { 
            if is_ko { format!("나른한 오후네요. 남은 하루를 위한 목표를 세워보죠.") }
            else { format!("Lazy afternoon. Let's set a goal for the rest of the day.") }
        },
        18..22 => if is_active { 
            if is_ko { format!("늦은 시간까지 열정이 넘치시네요. 무리하지 마세요!") }
            else { format!("Working late. Pace yourself and don't overdo it.") }
        } else { 
            if is_ko { format!("퇴근 시간이 지났네요. 내일을 위해 가볍게 정리해볼까요?") }
            else { format!("Past clock-out time. Shall we organize for tomorrow?") }
        },
        22..24 | 0..4 => if is_active { 
            if is_ko { format!("밤샘 작업 중이시군요! 이번 작업 후엔 꼭 휴식하세요.") }
            else { format!("Working the night shift! Please take a rest after this.") }
        } else { 
            if is_ko { format!("오늘 하루 고생 많으셨습니다. 평온한 밤 되세요.") }
            else { format!("Great job today. Have a peaceful night.") }
        },
        4..6 => if is_active { 
            if is_ko { format!("벌써 시작하셨나요? 기록하는 걸 잊지 마세요.") }
            else { format!("An early start! Don't forget to log your progress.") }
        } else { 
            if is_ko { format!("이른 새벽이네요. 고요한 시간에 어떤 계획을 세워볼까요?") }
            else { format!("Early dawn. What plan will you make in this quiet time?") }
        },
        _ => if is_ko { format!("안녕하세요, {}님!", nickname) } else { format!("Hello, {}!", nickname) },
    };

    Ok(greeting)
}

#[tauri::command]
async fn add_task(state: State<'_, DbState>, input: AddTaskInput) -> Result<(), String> {
    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;

    // 1. 태스크 생성
    let task_result = sqlx::query(
        "INSERT INTO tasks (workspace_id, title, planning_memo) VALUES (?1, ?2, ?3)",
    )
    .bind(input.workspace_id)
    .bind(&input.title)
    .bind(&input.planning_memo)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let task_id = task_result.last_insert_rowid();

    // 2. 인박스 여부에 따른 처리
    if input.is_inbox.unwrap_or(false) {
        tx.commit().await.map_err(|e| e.to_string())?;
        return Ok(());
    }

    // 3. 긴급 업무 여부에 따른 처리
    if input.is_urgent {
        let current_now: Option<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND status = 'NOW' LIMIT 1")
            .bind(input.workspace_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        let now_dt = Local::now().naive_local();
        let urgent_duration = (input.hours * 60 + input.minutes) as i64;

        if let Some(block) = current_now {
            // 현재 태스크 중단 -> PENDING 처리 (찢어진 UI용)
            sqlx::query("UPDATE time_blocks SET end_time = ?1, status = 'PENDING' WHERE id = ?2")
                .bind(now_dt.format("%Y-%m-%dT%H:%M:%S").to_string())
                .bind(block.id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;

            let original_end = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
            let remaining_duration = (original_end - now_dt).num_minutes();

            // 긴급 업무 삽입
            schedule_task_blocks(&mut tx, input.workspace_id, task_id, &input.title, now_dt, urgent_duration).await?;

            // 남은 부분 삽입
            let resume_start = now_dt + Duration::minutes(urgent_duration);
            schedule_task_blocks(&mut tx, input.workspace_id, block.task_id.unwrap(), &block.title, resume_start, remaining_duration).await?;

            // 이후 블록 밀기
            shift_future_blocks(&mut tx, input.workspace_id, original_end, urgent_duration).await?;
        } else {
            schedule_task_blocks(&mut tx, input.workspace_id, task_id, &input.title, now_dt, urgent_duration).await?;
            shift_future_blocks(&mut tx, input.workspace_id, now_dt, urgent_duration).await?;
        }
    } else {
        // 일반 태스크 추가 (마지막 블록 뒤에 붙임)
        let last_block: Option<(String,)> = sqlx::query_as("SELECT end_time FROM time_blocks WHERE workspace_id = ?1 AND status != 'UNPLUGGED' ORDER BY end_time DESC LIMIT 1")
            .bind(input.workspace_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;

        let now_dt = Local::now().naive_local();
        let mut current_start = if let Some((last_end,)) = last_block {
            let le = NaiveDateTime::parse_from_str(&last_end, "%Y-%m-%dT%H:%M:%S").unwrap_or(now_dt);
            if le < now_dt { now_dt } else { le }
        } else {
            now_dt
        };

        let duration = (input.hours * 60 + input.minutes) as i64;
        schedule_task_blocks(&mut tx, input.workspace_id, task_id, &input.title, current_start, duration).await?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_inbox(state: State<'_, DbState>, workspace_id: i64) -> Result<Vec<Task>, String> {
    let list = sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE workspace_id = ?1 AND id NOT IN (SELECT task_id FROM time_blocks WHERE task_id IS NOT NULL)"
    )
    .bind(workspace_id)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(list)
}

#[tauri::command]
async fn move_to_inbox(state: State<'_, DbState>, block_id: i64) -> Result<(), String> {
    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;
    
    let block: TimeBlock = sqlx::query_as("SELECT * FROM time_blocks WHERE id = ?1")
        .bind(block_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(task_id) = block.task_id {
        sqlx::query("DELETE FROM time_blocks WHERE task_id = ?1")
            .bind(task_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn move_to_timeline(state: State<'_, DbState>, task_id: i64, workspace_id: i64) -> Result<(), String> {
    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;

    let task: Task = sqlx::query_as("SELECT * FROM tasks WHERE id = ?1")
        .bind(task_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let last_block: Option<(String,)> = sqlx::query_as("SELECT end_time FROM time_blocks WHERE workspace_id = ?1 AND status != 'UNPLUGGED' ORDER BY end_time DESC LIMIT 1")
        .bind(workspace_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let now_dt = Local::now().naive_local();
    let current_start = if let Some((last_end,)) = last_block {
        let le = NaiveDateTime::parse_from_str(&last_end, "%Y-%m-%dT%H:%M:%S").unwrap_or(now_dt);
        if le < now_dt { now_dt } else { le }
    } else {
        now_dt
    };

    // 기본 30분 할당
    schedule_task_blocks(&mut tx, workspace_id, task_id, &task.title, current_start, 30).await?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

// 헬퍼: 태스크를 언플러그드 시간을 피해 블록들로 스케줄링하여 저장
async fn schedule_task_blocks(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    workspace_id: i64,
    task_id: i64,
    title: &str,
    start_dt: NaiveDateTime,
    mut remaining_minutes: i64
) -> Result<(), String> {
    let mut current_start = start_dt;
    
    let unplugged: Vec<UnpluggedTime> = sqlx::query_as("SELECT * FROM unplugged_times WHERE workspace_id = ?1")
        .bind(workspace_id)
        .fetch_all(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

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
            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?1, ?2, ?3, ?4, ?5, 'WILL')")
                .bind(task_id).bind(workspace_id).bind(title)
                .bind(current_start.format("%Y-%m-%dT%H:%M:%S").to_string())
                .bind(end.format("%Y-%m-%dT%H:%M:%S").to_string())
                .execute(&mut **tx).await.map_err(|e| e.to_string())?;
        }

        remaining_minutes -= duration;
        if let Some(r) = resume_at { current_start = r; } else { break; }
    }
    Ok(())
}

// 헬퍼: 특정 시점 이후의 모든 블록들을 지정된 시간만큼 뒤로 밀기
async fn shift_future_blocks(
    tx: &mut sqlx::Transaction<'_, Sqlite>,
    workspace_id: i64,
    after_dt: NaiveDateTime,
    shift_minutes: i64
) -> Result<(), String> {
    let blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND start_time >= ?2 AND status = 'WILL'")
        .bind(workspace_id)
        .bind(after_dt.format("%Y-%m-%dT%H:%M:%S").to_string())
        .fetch_all(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    for block in blocks {
        let new_start = NaiveDateTime::parse_from_str(&block.start_time, "%Y-%m-%dT%H:%M:%S").unwrap() + Duration::minutes(shift_minutes);
        let new_end = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap() + Duration::minutes(shift_minutes);
        
        sqlx::query("UPDATE time_blocks SET start_time = ?1, end_time = ?2 WHERE id = ?3")
            .bind(new_start.format("%Y-%m-%dT%H:%M:%S").to_string())
            .bind(new_end.format("%Y-%m-%dT%H:%M:%S").to_string())
            .bind(block.id)
            .execute(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn process_task_transition(state: State<'_, DbState>, input: TaskTransitionInput) -> Result<(), String> {
    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;

    let block: TimeBlock = sqlx::query_as("SELECT * FROM time_blocks WHERE id = ?1")
        .bind(input.block_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    match input.action.as_str() {
        "COMPLETE_ON_TIME" | "COMPLETE_NOW" | "COMPLETE_AGO" => {
            let mut end_dt = if input.action == "COMPLETE_NOW" {
                Local::now().naive_local()
            } else if input.action == "COMPLETE_AGO" {
                Local::now().naive_local() - Duration::minutes(input.extra_minutes.unwrap_or(0) as i64)
            } else {
                NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap()
            };

            // 만약 현재 시각보다 늦게 완료했다면, 그만큼 미래 블록들을 밀어야 함 (COMPLETE_NOW/AGO 시에만)
            if input.action != "COMPLETE_ON_TIME" {
                let original_end = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
                if end_dt > original_end {
                    let diff = (end_dt - original_end).num_minutes();
                    shift_future_blocks(&mut tx, block.workspace_id, original_end, diff).await?;
                }
            }

            sqlx::query("UPDATE time_blocks SET status = 'DONE', end_time = ?1, review_memo = ?2 WHERE id = ?3")
                .bind(end_dt.format("%Y-%m-%dT%H:%M:%S").to_string())
                .bind(input.review_memo)
                .bind(input.block_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        },
        "DELAY" => {
            let extra = input.extra_minutes.unwrap_or(0) as i64;
            let current_end = NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap();
            let new_end = current_end + Duration::minutes(extra);

            // 현재 블록 시간 연장
            sqlx::query("UPDATE time_blocks SET end_time = ?1 WHERE id = ?2")
                .bind(new_end.format("%Y-%m-%dT%H:%M:%S").to_string())
                .bind(input.block_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;

            // 이후 모든 블록 밀기
            shift_future_blocks(&mut tx, block.workspace_id, current_end, extra).await?;
        },
        _ => return Err("Invalid action".to_string()),
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_timeline(state: State<'_, DbState>, workspace_id: i64, date: Option<String>) -> Result<Vec<TimeBlock>, String> {
    let target_date = if let Some(d) = date {
        NaiveDate::parse_from_str(&d, "%Y-%m-%d").unwrap_or(Local::now().date_naive())
    } else {
        Local::now().date_naive()
    };

    let start_of_day = target_date.and_hms_opt(0, 0, 0).unwrap().format("%Y-%m-%dT%H:%M:%S").to_string();
    let end_of_day = target_date.and_hms_opt(23, 59, 59).unwrap().format("%Y-%m-%dT%H:%M:%S").to_string();

    let mut blocks = sqlx::query_as::<_, TimeBlock>(
        "SELECT * FROM time_blocks WHERE workspace_id = ?1 AND start_time >= ?2 AND start_time <= ?3 ORDER BY start_time ASC"
    )
    .bind(workspace_id)
    .bind(start_of_day)
    .bind(end_of_day)
    .fetch_all(&state.pool)
    .await
    .map_err(|e| e.to_string())?;

    let unplugged: Vec<UnpluggedTime> = sqlx::query_as("SELECT * FROM unplugged_times WHERE workspace_id = ?1")
        .bind(workspace_id)
        .fetch_all(&state.pool)
        .await
        .map_err(|e| e.to_string())?;

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
        });
    }

    blocks.sort_by(|a, b| a.start_time.cmp(&b.start_time));
    Ok(blocks)
}

#[tauri::command]
async fn update_block_status(state: State<'_, DbState>, block_id: i64, status: String) -> Result<(), String> {
    sqlx::query("UPDATE time_blocks SET status = ?1 WHERE id = ?2")
        .bind(status)
        .bind(block_id)
        .execute(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn reorder_blocks(state: State<'_, DbState>, workspace_id: i64, block_ids: Vec<i64>) -> Result<(), String> {
    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;

    // 1. 모든 블록 정보 가져오기
    let mut all_blocks: Vec<TimeBlock> = sqlx::query_as("SELECT * FROM time_blocks WHERE workspace_id = ?1 AND status != 'DONE' ORDER BY start_time ASC")
        .bind(workspace_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    if all_blocks.is_empty() { return Ok(()); }

    // 2. 시작 기준 시간 설정 (첫 블록의 시작 시간)
    let start_dt = NaiveDateTime::parse_from_str(&all_blocks[0].start_time, "%Y-%m-%dT%H:%M:%S").unwrap();
    let mut current_time = start_dt;

    // 3. 언플러그드 타임 로드
    let unplugged: Vec<UnpluggedTime> = sqlx::query_as("SELECT * FROM unplugged_times WHERE workspace_id = ?1")
        .bind(workspace_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // 4. 요청된 순서대로 블록 재배치 (UNPLUGGED는 고정이라 제외하고 계산)
    for id in block_ids {
        if let Some(mut block) = all_blocks.iter().find(|b| b.id == id).cloned() {
            if block.status == "UNPLUGGED" { continue; }

            let duration_min = (NaiveDateTime::parse_from_str(&block.end_time, "%Y-%m-%dT%H:%M:%S").unwrap() - 
                               NaiveDateTime::parse_from_str(&block.start_time, "%Y-%m-%dT%H:%M:%S").unwrap()).num_minutes();
            
            // 언플러그드 타임 체크 및 건너뛰기
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
                .await
                .map_err(|e| e.to_string())?;

            current_time = new_end;
        }
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let app_dir = app_handle.path().app_data_dir().expect("failed to get app data dir");
                if !app_dir.exists() {
                    fs::create_dir_all(&app_dir).expect("failed to create app data dir");
                }
                let db_path = app_dir.join("will-done.db");
                let db_url = format!("sqlite://{}", db_path.to_str().expect("invalid db path"));
                if !db_path.exists() {
                    fs::File::create(&db_path).expect("failed to create db file");
                }
                let pool = SqlitePool::connect(&db_url).await.expect("failed to connect to database");
                
                if cfg!(debug_assertions) {
                    // sqlx::query("DROP TABLE IF EXISTS time_blocks").execute(&pool).await.ok();
                    // sqlx::query("DROP TABLE IF EXISTS tasks").execute(&pool).await.ok();
                    // sqlx::query("DROP TABLE IF EXISTS unplugged_times").execute(&pool).await.ok();
                    // sqlx::query("DROP TABLE IF EXISTS workspaces").execute(&pool).await.ok();
                    // sqlx::query("DROP TABLE IF EXISTS users").execute(&pool).await.ok();
                }

                sqlx::query("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY CHECK (id = 1), nickname TEXT NOT NULL, gemini_api_key TEXT)").execute(&pool).await.ok();
                sqlx::query("CREATE TABLE IF NOT EXISTS workspaces (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, core_time_start TEXT, core_time_end TEXT, role_intro TEXT)").execute(&pool).await.ok();
                sqlx::query("CREATE TABLE IF NOT EXISTS unplugged_times (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, label TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, planning_memo TEXT, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("CREATE TABLE IF NOT EXISTS time_blocks (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, status TEXT NOT NULL, review_memo TEXT, FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();

                app_handle.manage(DbState { pool });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_user, 
            save_user, 
            check_user_exists,
            create_workspace,
            get_workspaces,
            get_workspace,
            update_workspace,
            get_unplugged_times,
            get_greeting,
            add_task,
            get_timeline,
            get_inbox,
            move_to_inbox,
            move_to_timeline,
            process_task_transition,
            update_block_status,
            reorder_blocks
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePool;

    #[tokio::test]
    async fn test_create_workspace_transaction() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::query("CREATE TABLE workspaces (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, core_time_start TEXT, core_time_end TEXT, role_intro TEXT)").execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE unplugged_times (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, label TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces (id))").execute(&pool).await.unwrap();

        let input = CreateWorkspaceInput {
            name: "Test Workspace".to_string(),
            core_time_start: Some("09:00".to_string()),
            core_time_end: Some("18:00".to_string()),
            role_intro: Some("Engineer".to_string()),
            unplugged_times: vec![],
        };

        let mut tx = pool.begin().await.unwrap();
        let result = sqlx::query("INSERT INTO workspaces (name, core_time_start, core_time_end, role_intro) VALUES (?1, ?2, ?3, ?4)").bind(&input.name).bind(&input.core_time_start).bind(&input.core_time_end).bind(&input.role_intro).execute(&mut *tx).await.unwrap();
        let workspace_id = result.last_insert_rowid();
        tx.commit().await.unwrap();

        let ws = sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces WHERE id = ?1").bind(workspace_id).fetch_one(&pool).await.unwrap();
        assert_eq!(ws.name, "Test Workspace");
    }
}
