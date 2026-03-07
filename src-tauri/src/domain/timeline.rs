use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: i64,
    pub workspace_id: i64,
    pub title: String,
    pub planning_memo: Option<String>,
    pub estimated_minutes: i64,
    pub project_id: Option<i64>,
    pub label_id: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct TimeBlock {
    pub id: i64,
    pub task_id: Option<i64>,
    pub workspace_id: i64,
    pub title: String,
    pub start_time: String,
    pub end_time: String,
    pub status: String, // DONE, NOW, WILL, UNPLUGGED, PENDING
    pub review_memo: Option<String>,
    pub planning_memo: Option<String>,
    pub is_urgent: bool,
    #[sqlx(default)]
    pub project_name: Option<String>,
    #[sqlx(default)]
    pub label_name: Option<String>,
    #[sqlx(default)]
    pub label_color: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AddTaskInput {
    pub workspace_id: i64,
    pub title: String,
    pub hours: i32,
    pub minutes: i32,
    pub planning_memo: Option<String>,
    pub is_urgent: bool,
    pub is_inbox: Option<bool>,
    pub project_name: Option<String>,
    pub label_name: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TaskTransitionInput {
    pub block_id: i64,
    pub action: String, // COMPLETE, DELAY, FORGOT
    pub extra_minutes: Option<i32>,
    pub review_memo: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub block_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub hours: i32,
    pub minutes: i32,
    pub review_memo: Option<String>,
    pub project_name: Option<String>,
    pub label_name: Option<String>,
}
