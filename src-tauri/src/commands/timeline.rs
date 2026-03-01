use tauri::State;
use chrono::{Local, NaiveDate, Timelike};
use crate::models::{Task, TimeBlock, AddTaskInput, TaskTransitionInput, DbState};
use crate::database;
use crate::error::{Result, AppError};

#[tauri::command]
pub async fn get_timeline(state: State<'_, DbState>, workspace_id: i64, date: Option<String>) -> Result<Vec<TimeBlock>> {
    let target_date = if let Some(d) = date {
        NaiveDate::parse_from_str(&d, "%Y-%m-%d").map_err(|e| AppError::DateParse(e.to_string()))?
    } else {
        Local::now().date_naive()
    };
    database::timeline::get_timeline(&state.pool, workspace_id, target_date).await
}

#[tauri::command]
pub async fn get_inbox(state: State<'_, DbState>, workspace_id: i64) -> Result<Vec<Task>> {
    database::timeline::get_inbox(&state.pool, workspace_id).await
}

#[tauri::command]
pub async fn add_task(state: State<'_, DbState>, input: AddTaskInput) -> Result<()> {
    database::timeline::add_task(&state.pool, input).await
}

#[tauri::command]
pub async fn move_to_inbox(state: State<'_, DbState>, block_id: i64) -> Result<()> {
    database::timeline::move_to_inbox(&state.pool, block_id).await
}

#[tauri::command]
pub async fn move_to_timeline(state: State<'_, DbState>, task_id: i64, workspace_id: i64) -> Result<()> {
    database::timeline::move_to_timeline(&state.pool, task_id, workspace_id).await
}

#[tauri::command]
pub async fn move_all_to_timeline(state: State<'_, DbState>, workspace_id: i64) -> Result<()> {
    database::timeline::move_all_to_timeline(&state.pool, workspace_id).await
}

#[tauri::command]
pub async fn delete_task(state: State<'_, DbState>, id: i64) -> Result<()> {
    database::timeline::delete_task(&state.pool, id).await
}

#[tauri::command]
pub async fn process_task_transition(state: State<'_, DbState>, input: TaskTransitionInput) -> Result<()> {
    database::timeline::process_task_transition(&state.pool, input).await
}

#[tauri::command]
pub async fn update_block_status(state: State<'_, DbState>, block_id: i64, status: String) -> Result<()> {
    database::timeline::update_block_status(&state.pool, block_id, &status).await
}

#[tauri::command]
pub async fn reorder_blocks(state: State<'_, DbState>, workspace_id: i64, block_ids: Vec<i64>) -> Result<()> {
    database::timeline::reorder_blocks(&state.pool, workspace_id, block_ids).await
}

#[tauri::command]
pub async fn get_active_dates(state: State<'_, DbState>, workspace_id: i64) -> Result<Vec<String>> {
    database::timeline::get_active_dates(&state.pool, workspace_id).await
}

#[tauri::command]
pub async fn get_greeting(state: State<'_, DbState>, workspace_id: i64, lang: String) -> Result<String> {
    let user = database::user::get_user(&state.pool).await?.ok_or(AppError::NotFound("User not found".to_string()))?;
    let now = Local::now();
    let hour = now.hour();

    let is_active = database::timeline::check_active_block_exists(&state.pool, workspace_id).await?;
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
