use tauri::State;
use chrono::{NaiveDate, NaiveDateTime};
use crate::models::{Retrospective, DbState, GeminiModel, GeminiModelsResponse, GeminiRequest, GeminiContent, GeminiPart, GeminiSystemInstruction, GeminiResponse};
use crate::database;
use crate::error::{Result, AppError};

#[tauri::command]
pub async fn generate_retrospective(
    state: State<'_, DbState>,
    workspace_id: i64,
    start_date: String, // "YYYY-MM-DD"
    end_date: String,   // "YYYY-MM-DD"
    retro_type: String, // "DAILY", "WEEKLY", "MONTHLY"
    date_label: String, // "2026-03-01", "2026-W09", etc.
) -> Result<Retrospective> {
    let user = database::user::get_user(&state.pool).await?.ok_or(AppError::NotFound("User not found".to_string()))?;

    // Check for duplicates
    if database::retrospective::check_retrospective_exists(&state.pool, workspace_id, &date_label, &retro_type).await? {
        return Err(AppError::InvalidInput("A retrospective for this period already exists.".to_string()));
    }

    let api_key = user.gemini_api_key.ok_or(AppError::InvalidInput("Gemini API Key is missing. Please set it in Settings.".to_string()))?;
    
    let workspace = database::workspace::get_workspace(&state.pool, workspace_id).await?.ok_or(AppError::NotFound("Workspace not found".to_string()))?;
    let role_intro = workspace.role_intro.unwrap_or_else(|| "A professional worker".to_string());

    let start_dt = NaiveDate::parse_from_str(&start_date, "%Y-%m-%d").map_err(|e| AppError::DateParse(e.to_string()))?;
    let end_dt = NaiveDate::parse_from_str(&end_date, "%Y-%m-%d").map_err(|e| AppError::DateParse(e.to_string()))?;

    let start_of_range = start_dt.and_hms_opt(0, 0, 0).unwrap().format("%Y-%m-%dT%H:%M:%S").to_string();
    let end_of_range = end_dt.and_hms_opt(23, 59, 59).unwrap().format("%Y-%m-%dT%H:%M:%S").to_string();

    let blocks = database::retrospective::get_completed_task_blocks(&state.pool, workspace_id, &start_of_range, &end_of_range).await?;

    if blocks.is_empty() {
        return Err(AppError::InvalidInput("No completed tasks found for the selected period.".to_string()));
    }

    let task_summary = build_task_summary(blocks);
    
    let base_system_prompt = match retro_type.as_str() {
        "DAILY" => "You are an expert productivity coach. Analyze the user's completed tasks for today. Highlight what was achieved, identify any potential blockers or interrupted flows (e.g., urgent tasks), and suggest a brief, actionable focus for tomorrow.",
        "WEEKLY" => "You are an expert productivity coach. Review the user's completed tasks for the past week. Identify major trends, areas of high productivity, and overall achievements. Provide constructive feedback and a strategic focus for the upcoming week.",
        "MONTHLY" => "You are an expert productivity coach. Evaluate the user's performance over the past month. Summarize key milestones, consistent patterns, and the overall impact of their work. Suggest long-term goals and areas for professional growth.",
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

    let client = reqwest::Client::new();
    let mut models_to_try = Vec::new();

    // 1. Try last successful model if exists
    if let Some(ref cached_model) = user.last_successful_model {
        models_to_try.push(GeminiModel {
            name: cached_model.clone(),
            supported_generation_methods: vec!["generateContent".to_string()],
            thinking: false,
        });
    }

    // 2. Fetch available models and filter/sort
    let available_models = fetch_available_models(&client, &api_key).await.unwrap_or_default();
    let mut filtered_models = available_models.into_iter()
        .filter(|m| m.supported_generation_methods.contains(&"generateContent".to_string()))
        .collect::<Vec<_>>();

    // Priority score: flash-lite (3) > flash (2) > pro (1)
    filtered_models.sort_by(|a, b| {
        let score = |name: &str| {
            if name.contains("flash-lite") { 3 }
            else if name.contains("flash") { 2 }
            else if name.contains("pro") { 1 }
            else { 0 }
        };
        let s_a = score(&a.name);
        let s_b = score(&b.name);
        if s_a != s_b {
            s_b.cmp(&s_a) // Higher score first
        } else {
            b.name.cmp(&a.name) // Higher version (descending string) first
        }
    });

    for m in filtered_models {
        if !models_to_try.iter().any(|existing| existing.name == m.name) {
            models_to_try.push(m);
        }
    }

    let mut result_text = None;
    let mut final_model_name = None;

    for model in models_to_try {
        match try_generate_content(&client, &api_key, &model, &final_system_prompt, &user_content).await {
            Ok(text) => {
                result_text = Some(text);
                final_model_name = Some(model.name);
                break;
            }
            Err(e) => {
                eprintln!("Model {} failed: {}", model.name, e);
                continue;
            }
        }
    }

    let result_text = result_text.ok_or(AppError::Internal("All Gemini models failed to generate content.".to_string()))?;
    let final_model_name = final_model_name.unwrap();

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

async fn fetch_available_models(client: &reqwest::Client, api_key: &str) -> Result<Vec<GeminiModel>> {
    let url = format!("https://generativelanguage.googleapis.com/v1/models?key={}", api_key);
    let res = client.get(url).send().await?;
    if !res.status().is_success() {
        return Err(AppError::Network(res.error_for_status().unwrap_err()));
    }
    let data: GeminiModelsResponse = res.json().await?;
    Ok(data.models)
}

async fn try_generate_content(
    client: &reqwest::Client,
    api_key: &str,
    model: &GeminiModel,
    system_prompt: &str,
    user_content: &str,
) -> Result<String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/{}:generateContent",
        model.name
    );

    let supports_system_instruction = model.name.contains("gemini-1.5") || 
                                     model.name.contains("gemini-2.0") || 
                                     model.name.contains("gemini-2.5");

    let body = if supports_system_instruction {
        GeminiRequest {
            contents: vec![GeminiContent {
                parts: vec![GeminiPart { text: user_content.to_string() }],
            }],
            system_instruction: Some(GeminiSystemInstruction {
                parts: vec![GeminiPart { text: system_prompt.to_string() }],
            }),
        }
    } else {
        GeminiRequest {
            contents: vec![GeminiContent {
                parts: vec![GeminiPart { 
                    text: format!("{}

{}", system_prompt, user_content)
                }],
            }],
            system_instruction: None,
        }
    };

    let response = client.post(&url)
        .header("x-goog-api-key", api_key)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let err_text = response.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!("API Error ({}): {}", status, err_text)));
    }

    let gemini_res: GeminiResponse = response.json().await?;
    let result_text = gemini_res.candidates.get(0)
        .and_then(|c| c.content.parts.get(0))
        .map(|p| p.text.clone())
        .ok_or(AppError::Internal("No candidates returned from Gemini".to_string()))?;

    Ok(result_text)
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
