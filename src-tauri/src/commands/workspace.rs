use tauri::State;
use crate::domain::{Workspace, UnpluggedTime, CreateWorkspaceInput, DbState, Project, Label, ProjectInput, LabelInput};
use crate::services;
use crate::domain::Result;

#[tauri::command]
pub async fn create_workspace(
    state: State<'_, DbState>,
    input: CreateWorkspaceInput,
) -> Result<i64> {
    services::workspace::create_workspace(&state.pool, input).await
}

#[tauri::command]
pub async fn get_workspaces(state: State<'_, DbState>) -> Result<Vec<Workspace>> {
    services::workspace::get_workspaces(&state.pool).await
}

#[tauri::command]
pub async fn get_workspace(state: State<'_, DbState>, id: i64) -> Result<Option<Workspace>> {
    services::workspace::get_workspace(&state.pool, id).await
}

#[tauri::command]
pub async fn get_unplugged_times(state: State<'_, DbState>, workspace_id: i64) -> Result<Vec<UnpluggedTime>> {
    services::workspace::get_unplugged_times(&state.pool, workspace_id).await
}

#[tauri::command]
pub async fn update_workspace(
    state: State<'_, DbState>,
    id: i64,
    input: CreateWorkspaceInput,
) -> Result<()> {
    services::workspace::update_workspace(&state.pool, id, input).await
}

#[tauri::command]
pub async fn delete_workspace(state: State<'_, DbState>, id: i64) -> Result<()> {
    services::workspace::delete_workspace(&state.pool, id).await
}

#[tauri::command]
pub async fn suggest_task_titles(
    state: State<'_, DbState>,
    workspace_id: i64,
    query: String,
    limit: i64,
) -> Result<Vec<String>> {
    services::workspace::suggest_task_titles(&state.pool, workspace_id, &query, limit).await
}

#[tauri::command]
pub async fn get_projects(state: State<'_, DbState>) -> Result<Vec<Project>> {
    services::workspace::get_projects(&state.pool).await
}

#[tauri::command]
pub async fn create_project(state: State<'_, DbState>, input: ProjectInput) -> Result<i64> {
    services::workspace::create_project(&state.pool, input).await
}

#[tauri::command]
pub async fn update_project(state: State<'_, DbState>, id: i64, input: ProjectInput) -> Result<()> {
    services::workspace::update_project(&state.pool, id, input).await
}

#[tauri::command]
pub async fn delete_project(state: State<'_, DbState>, id: i64) -> Result<()> {
    services::workspace::delete_project(&state.pool, id).await
}

#[tauri::command]
pub async fn get_labels(state: State<'_, DbState>) -> Result<Vec<Label>> {
    services::workspace::get_labels(&state.pool).await
}

#[tauri::command]
pub async fn create_label(state: State<'_, DbState>, input: LabelInput) -> Result<i64> {
    services::workspace::create_label(&state.pool, input).await
}

#[tauri::command]
pub async fn update_label(state: State<'_, DbState>, id: i64, input: LabelInput) -> Result<()> {
    services::workspace::update_label(&state.pool, id, input).await
}

#[tauri::command]
pub async fn delete_label(state: State<'_, DbState>, id: i64) -> Result<()> {
    services::workspace::delete_label(&state.pool, id).await
}
