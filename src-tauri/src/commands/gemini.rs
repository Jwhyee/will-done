use tauri::State;
use crate::domain::{DbState, Result, AppError, GeminiRequest, GeminiContent, GeminiPart, GeminiSystemInstruction, GeminiResponse};
use crate::database;
use reqwest;
use chrono::Local;

#[tauri::command]
pub async fn check_daily_exhausted_log(
    state: State<'_, DbState>,
) -> Result<bool> {
    let today = Local::now().format("%Y-%m-%d").to_string();
    database::gemini::check_daily_exhausted_log(&state.pool, &today).await.map_err(AppError::Database)
}

pub async fn execute_with_fallback(
    state: &State<'_, DbState>,
    system_prompt: &str,
    user_content: &str,
    force_retry: bool,
) -> Result<(String, String)> {
    let today = Local::now().format("%Y-%m-%d").to_string();
    
    // Check if exhausted today, unless force_retry is true
    if !force_retry {
        if database::gemini::check_daily_exhausted_log(&state.pool, &today).await.unwrap_or(false) {
            return Err(AppError::Internal("QUOTA_EXHAUSTED".to_string()));
        }
    }

    let user = database::user::get_user(&state.pool).await?.ok_or(AppError::NotFound("User not found".to_string()))?;
    let api_key = user.gemini_api_key.ok_or(AppError::InvalidInput("Gemini API Key is missing.".to_string()))?;

    let models = database::gemini::get_active_models(&state.pool).await.map_err(AppError::Database)?;
    
    if models.is_empty() {
        return Err(AppError::Internal("No active Gemini models found. Please wait for sync.".to_string()));
    }

    let client = reqwest::Client::new();
    let mut last_error = None;

    for model in models {
        match try_generate_content(&client, &api_key, &model.model_name, system_prompt, user_content).await {
            Ok(text) => {
                // Clear exhausted log if it was force retried and succeeded
                if force_retry {
                    let _ = database::gemini::clear_exhausted(&state.pool, &today).await;
                }
                return Ok((text, model.model_name));
            }
            Err(e) => {
                let err_msg = e.to_string();
                // 429 = Too Many Requests, 403 = Forbidden (often related to quotas/permissions)
                if err_msg.contains("429") || err_msg.contains("403") {
                    println!("Model {} exhausted ({}). Trying next...", model.model_name, err_msg);
                    last_error = Some(e);
                    continue;
                } else {
                    // Other errors might be fatal (e.g. invalid API key)
                    return Err(e);
                }
            }
        }
    }

    // If we reached here, all models failed
    let _ = database::gemini::log_exhausted(&state.pool, &today).await;
    
    Err(last_error.unwrap_or(AppError::Internal("All Gemini models failed.".to_string())))
}

async fn try_generate_content(
    client: &reqwest::Client,
    api_key: &str,
    model_name: &str,
    system_prompt: &str,
    user_content: &str,
) -> Result<String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
        model_name
    );

    // Assume all modern models support system instructions
    let body = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart { text: user_content.to_string() }],
        }],
        system_instruction: Some(GeminiSystemInstruction {
            parts: vec![GeminiPart { text: system_prompt.to_string() }],
        }),
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
