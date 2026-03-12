use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Achievement {
    pub id: i64,
    pub workspace_id: i64,
    pub achievement_type: String, // "DAILY"
    pub content: String,
    pub date_label: String, // e.g., "2026-03-01"
    pub created_at: String,
    pub used_model: Option<String>,
}
