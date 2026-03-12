use tauri::State;
use chrono::NaiveDateTime;
use crate::domain::{Retrospective, DbState};
use crate::database;
use crate::domain::{Result, AppError};

#[tauri::command]
pub async fn generate_retrospective(
    state: State<'_, DbState>,
    workspace_id: i64,
    start_date: String, // "YYYY-MM-DD"
    end_date: String,   // "YYYY-MM-DD"
    retro_type: String, // "DAILY", "WEEKLY", "MONTHLY"
    date_label: String, // "2026-03-01", "2026-W09", etc.
    force_retry: bool,
) -> Result<Retrospective> {
    let user = database::user::get_user(&state.pool).await?.ok_or(AppError::NotFound("User not found".to_string()))?;

    // Check for duplicates
    if database::retrospective::check_retrospective_exists(&state.pool, workspace_id, &date_label, &retro_type).await? {
        return Err(AppError::InvalidInput("A retrospective for this period already exists.".to_string()));
    }


    let workspace = database::workspace::get_workspace(&state.pool, workspace_id).await?.ok_or(AppError::NotFound("Workspace not found".to_string()))?;
    let role_intro = workspace.role_intro.unwrap_or_else(|| "A professional worker".to_string());

    let day_start_time = &user.day_start_time;
    let start_of_range = NaiveDateTime::parse_from_str(&format!("{}T{}", start_date, day_start_time), "%Y-%m-%dT%H:%M")
        .map_err(|e| AppError::DateParse(e.to_string()))?
        .format("%Y-%m-%dT%H:%M:00").to_string();
    let end_of_range = (NaiveDateTime::parse_from_str(&format!("{}T{}", end_date, day_start_time), "%Y-%m-%dT%H:%M")
        .map_err(|e| AppError::DateParse(e.to_string()))?
        + chrono::Duration::days(1) - chrono::Duration::seconds(1))
        .format("%Y-%m-%dT%H:%M:00").to_string();

    let blocks = database::retrospective::get_completed_task_blocks(&state.pool, workspace_id, &start_of_range, &end_of_range).await?;

    if blocks.is_empty() {
        return Err(AppError::InvalidInput("No completed tasks found for the selected period.".to_string()));
    }

    let task_summary = build_task_summary(blocks);
    
    let base_system_prompt = match retro_type.as_str() {
        "DAILY" => "You are an expert productivity coach. Analyze the user's completed tasks for today. Highlight what was achieved, identify any potential blockers or interrupted flows (e.g., urgent tasks), and suggest a brief, actionable focus for tomorrow.",
        _ => "You are an expert productivity coach helping a user write a professional retrospective.",
    };

    let user_lang = if user.lang == "ko" { "Korean" } else { "English" };
    let final_system_prompt = format!(
        "{}

CRITICAL RULE: Regardless of the instructions above, you MUST generate the final retrospective output entirely in the user's requested language: [{}].",
        base_system_prompt, user_lang
    );

    let period_desc = if start_date == end_date {
        format!("Daily summary for {}", start_date)
    } else {
        format!("Summary for the period from {} to {}", start_date, end_date)
    };

    let user_content = format!(
        "**Period**: {}

**User Role/Intro**: {}

**Completed Tasks**:
{}",
        period_desc, role_intro, task_summary
    );

    let (result_text, final_model_name) = crate::commands::gemini::execute_with_fallback(
        &state,
        &final_system_prompt,
        &user_content,
        force_retry,
    ).await?;

    // Cache successful model
    database::user::save_last_model(&state.pool, &final_model_name).await?;

    // Save result to DB
    database::retrospective::save_retrospective(
        &state.pool,
        workspace_id,
        &retro_type,
        &result_text,
        &date_label,
        Some(&final_model_name),
    ).await
}

#[tauri::command]
pub async fn get_saved_retrospectives(
    state: State<'_, DbState>,
    workspace_id: i64,
    date_label: String,
) -> Result<Vec<Retrospective>> {
    database::retrospective::get_saved_retrospectives(&state.pool, workspace_id, &date_label).await
}

#[tauri::command]
pub async fn get_latest_saved_retrospective(
    state: State<'_, DbState>,
    workspace_id: i64,
) -> Result<Option<Retrospective>> {
    database::retrospective::get_latest_saved_retrospective(&state.pool, workspace_id).await
}

fn build_task_summary(blocks: Vec<(String, Option<String>, Option<String>, String, String)>) -> String {
    let mut task_summary = String::new();
    for (title, planning, review, start, end) in blocks {
        let s = NaiveDateTime::parse_from_str(&start, "%Y-%m-%dT%H:%M:%S").unwrap_or_default();
        let e = NaiveDateTime::parse_from_str(&end, "%Y-%m-%dT%H:%M:%S").unwrap_or_default();
        let duration = (e - s).num_minutes();
        
        task_summary.push_str(&format!(
            "### Task: {}
- **Duration**: {} mins
- **Planning**: {}
- **Review/Outcome**: {}

",
            title,
            duration,
            planning.unwrap_or_else(|| "N/A".to_string()),
            review.unwrap_or_else(|| "N/A".to_string())
        ));
    }
    task_summary
}

#[tauri::command]
pub async fn fetch_available_models(
    state: State<'_, DbState>,
) -> Result<Vec<crate::domain::DbGeminiModel>> {
    database::gemini::get_active_models(&state.pool).await.map_err(AppError::Database)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_task_summary() {
        let blocks = vec![
            (
                "Task 1".to_string(),
                Some("Planning 1".to_string()),
                Some("Review 1".to_string()),
                "2026-03-01T09:00:00".to_string(),
                "2026-03-01T10:00:00".to_string(),
            ),
            (
                "Task 2".to_string(),
                None,
                None,
                "2026-03-01T10:30:00".to_string(),
                "2026-03-01T11:00:00".to_string(),
            ),
        ];

        let summary = build_task_summary(blocks);
        assert!(summary.contains("### Task: Task 1"));
        assert!(summary.contains("- **Duration**: 60 mins"));
        assert!(summary.contains("- **Planning**: Planning 1"));
        assert!(summary.contains("- **Review/Outcome**: Review 1"));
        assert!(summary.contains("### Task: Task 2"));
        assert!(summary.contains("- **Duration**: 30 mins"));
        assert!(summary.contains("- **Planning**: N/A"));
        assert!(summary.contains("- **Review/Outcome**: N/A"));
    }
}
