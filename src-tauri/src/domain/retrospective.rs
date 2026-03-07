use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Retrospective {
    pub id: i64,
    pub workspace_id: i64,
    pub retro_type: String, // DAILY, WEEKLY, MONTHLY
    pub content: String,
    pub date_label: String, // e.g., "2026-03-01", "2026-W09", "2026-03"
    pub created_at: String,
    pub used_model: Option<String>,
}
