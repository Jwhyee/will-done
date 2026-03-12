use sqlx::SqlitePool;
use chrono::NaiveDateTime;
use crate::domain::{Retrospective, Result, AppError, DbGeminiModel};
use crate::database;
use crate::services;

pub async fn generate_retrospective(
    pool: &SqlitePool,
    workspace_id: i64,
    start_date: &str, // "YYYY-MM-DD"
    end_date: &str,   // "YYYY-MM-DD"
    retro_type: &str, // "DAILY", "WEEKLY", "MONTHLY"
    date_label: &str, // "2026-03-01", "2026-W09", etc.
    force_retry: bool,
    overwrite: bool,
    target_model: Option<String>,
) -> Result<Retrospective> {
    let user = database::user::get_user(pool).await?.ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Check for duplicates
    let already_exists = database::retrospective::check_retrospective_exists(pool, workspace_id, date_label, retro_type).await?;
    if !overwrite && already_exists {
        return Err(AppError::InvalidInput("A retrospective for this period already exists.".to_string()));
    }

    let workspace = database::workspace::get_workspace(pool, workspace_id).await?.ok_or_else(|| AppError::NotFound("Workspace not found".to_string()))?;
    let role_intro = workspace.role_intro.unwrap_or_else(|| "A professional worker".to_string());

    let day_start_time = &user.day_start_time;
    let start_of_range = NaiveDateTime::parse_from_str(&format!("{}T{}", start_date, day_start_time), "%Y-%m-%dT%H:%M")
        .map_err(|e| AppError::DateParse(e.to_string()))?
        .format("%Y-%m-%dT%H:%M:00").to_string();
    let end_of_range = (NaiveDateTime::parse_from_str(&format!("{}T{}", end_date, day_start_time), "%Y-%m-%dT%H:%M")
        .map_err(|e| AppError::DateParse(e.to_string()))?
        + chrono::Duration::days(1) - chrono::Duration::seconds(1))
        .format("%Y-%m-%dT%H:%M:00").to_string();

    let blocks = database::retrospective::get_completed_task_blocks(pool, workspace_id, &start_of_range, &end_of_range).await?;

    if blocks.is_empty() {
        return Err(AppError::InvalidInput("No completed tasks found for the selected period.".to_string()));
    }

    let task_summary = build_task_summary(blocks);
    
    let base_system_prompt = "You are an expert technical writer helping a professional document their daily achievements.
Your goal is to transform the user's raw task logs into a highly objective, professional 'Brag Document' (Performance Report) suitable for a resume or performance review.

CRITICAL RULES:
1. Tone: Strictly professional, objective, and action-oriented. NEVER use emotional or coaching language.
2. Action Verbs: Start every bullet point with a strong action verb (e.g., Implemented, Optimized, Redesigned, Resolved).
3. Value-Driven Translation: Translate mundane tasks (like \"deleted a feature\" or \"fixed a bug\") into value-driven achievements (e.g., \"Streamlined user experience by deprecating redundant features\", \"Enhanced system stability by resolving edge cases\").
4. Structure: 
   - Focus strictly on WHAT was done and the IMPACT.
   - DO NOT include a \"Pending Issues\", \"Suggestions for tomorrow\", or \"Action Plan\" section. Only document completed work.
   - DO NOT include the user's role in the output.

OUTPUT LAYOUT:
### 1. 주요 성과 (Key Achievements)
- [Action Verb] + [Context/Task] + [Impact/Result]
- ...

### 2. 기술 및 시스템 최적화 (Technical & System Optimizations)
- (Focus on refactoring, tech debt removal, performance, or structural improvements)";

    let user_lang = if user.lang == "ko" { "Korean" } else { "English" };
    let final_system_prompt = format!(
        "{}

CRITICAL RULE: Regardless of the instructions above, you MUST generate the final output entirely in the user's requested language: [{}].",
        base_system_prompt, user_lang
    );

    let period_desc = if start_date == end_date {
        format!("Daily Performance Summary for {}", start_date)
    } else {
        format!("Performance Summary from {} to {}", start_date, end_date)
    };

    let user_content = format!(
        "**Period**: {}

**User Role/Context**: {} (NOTE: Use this ONLY to understand the technical context. DO NOT mention this role in your generated output.)

**Completed Tasks**:
{}",
        period_desc, role_intro, task_summary
    );

    let (result_text, final_model_name) = match target_model {
        Some(model_name) => {
            let res = services::gemini::execute_single_model(
                pool,
                &model_name,
                &final_system_prompt,
                &user_content,
            ).await?;
            (res, model_name)
        }
        None => {
            services::gemini::execute_with_fallback(
                pool,
                &final_system_prompt,
                &user_content,
                force_retry,
            ).await?
        }
    };

    // Cache successful model
    database::user::save_last_model(pool, &final_model_name).await?;

    // Save or update result in DB
    if already_exists {
        database::retrospective::update_retrospective(
            pool,
            workspace_id,
            retro_type,
            &result_text,
            date_label,
            Some(&final_model_name),
        ).await
    } else {
        database::retrospective::save_retrospective(
            pool,
            workspace_id,
            retro_type,
            &result_text,
            date_label,
            Some(&final_model_name),
        ).await
    }
}

pub async fn get_saved_retrospectives(
    pool: &SqlitePool,
    workspace_id: i64,
    date_label: &str,
) -> Result<Vec<Retrospective>> {
    database::retrospective::get_saved_retrospectives(pool, workspace_id, date_label).await
}

pub async fn get_latest_saved_retrospective(
    pool: &SqlitePool,
    workspace_id: i64,
) -> Result<Option<Retrospective>> {
    database::retrospective::get_latest_saved_retrospective(pool, workspace_id).await
}

pub async fn fetch_available_models(
    pool: &SqlitePool,
) -> Result<Vec<DbGeminiModel>> {
    database::gemini::get_active_models(pool).await.map_err(AppError::Database)
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
