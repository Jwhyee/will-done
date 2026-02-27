use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Workspace {
    pub id: i64,
    pub name: String,
    pub core_time_start: Option<String>, // HH:mm
    pub core_time_end: Option<String>,   // HH:mm
    pub role_intro: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UnpluggedTime {
    pub id: i64,
    pub workspace_id: i64,
    pub label: String,
    pub start_time: String, // HH:mm
    pub end_time: String,   // HH:mm
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: i64,
    pub workspace_id: i64,
    pub title: String,
    pub planning_memo: Option<String>,
    pub is_routine: bool,
    pub is_urgent: bool,
    pub created_at: String,
    pub status: String, // 'Scheduled', 'InProgress', 'Completed'
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimeBlock {
    pub id: i64,
    pub task_id: i64,
    pub start_time: Option<String>, // ISO8601
    pub end_time: Option<String>,   // ISO8601
    pub status: String, // 'Will', 'Now', 'Done', 'Unplugged'
    pub review_memo: Option<String>,
}
