use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: i64,
    pub nickname: String,
    pub gemini_api_key: Option<String>,
    pub lang: String,
    pub last_successful_model: Option<String>,
    pub is_notification_enabled: bool,
    pub day_start_time: String,
}
