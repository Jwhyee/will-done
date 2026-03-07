use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: i64,
    pub name: String,
    pub core_time_start: Option<String>,
    pub core_time_end: Option<String>,
    pub role_intro: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct UnpluggedTime {
    pub id: i64,
    pub workspace_id: i64,
    pub label: String,
    pub start_time: String,
    pub end_time: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub last_used: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Label {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub last_used: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInput {
    pub name: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LabelInput {
    pub name: String,
    pub color: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceInput {
    pub name: String,
    pub core_time_start: Option<String>,
    pub core_time_end: Option<String>,
    pub role_intro: Option<String>,
    pub unplugged_times: Vec<UnpluggedTimeInput>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UnpluggedTimeInput {
    pub label: String,
    pub start_time: String,
    pub end_time: String,
}
