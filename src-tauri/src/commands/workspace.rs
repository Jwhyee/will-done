use tauri::State;
use crate::models::{Workspace, UnpluggedTime, CreateWorkspaceInput, DbState, Project, Label, ProjectInput, LabelInput};
use crate::database;
use crate::error::Result;

#[tauri::command]
pub async fn create_workspace(
    state: State<'_, DbState>,
    input: CreateWorkspaceInput,
) -> Result<i64> {
    database::workspace::create_workspace(&state.pool, input).await
}

#[tauri::command]
pub async fn get_workspaces(state: State<'_, DbState>) -> Result<Vec<Workspace>> {
    database::workspace::get_workspaces(&state.pool).await
}

#[tauri::command]
pub async fn get_workspace(state: State<'_, DbState>, id: i64) -> Result<Option<Workspace>> {
    database::workspace::get_workspace(&state.pool, id).await
}

#[tauri::command]
pub async fn get_unplugged_times(state: State<'_, DbState>, workspace_id: i64) -> Result<Vec<UnpluggedTime>> {
    database::workspace::get_unplugged_times(&state.pool, workspace_id).await
}

#[tauri::command]
pub async fn update_workspace(
    state: State<'_, DbState>,
    id: i64,
    input: CreateWorkspaceInput,
) -> Result<()> {
    database::workspace::update_workspace(&state.pool, id, input).await
}

#[tauri::command]
pub async fn delete_workspace(state: State<'_, DbState>, id: i64) -> Result<()> {
    database::workspace::delete_workspace(&state.pool, id).await
}

#[tauri::command]
pub async fn suggest_task_titles(
    state: State<'_, DbState>,
    workspace_id: i64,
    query: String,
    limit: i64,
) -> Result<Vec<String>> {
    database::workspace::search_task_titles(&state.pool, workspace_id, &query, limit).await
}

#[tauri::command]
pub async fn get_projects(state: State<'_, DbState>) -> Result<Vec<Project>> {
    database::workspace::get_projects(&state.pool).await
}

#[tauri::command]
pub async fn create_project(state: State<'_, DbState>, input: ProjectInput) -> Result<i64> {
    database::workspace::create_project(&state.pool, input).await
}

#[tauri::command]
pub async fn update_project(state: State<'_, DbState>, id: i64, input: ProjectInput) -> Result<()> {
    database::workspace::update_project(&state.pool, id, input).await
}

#[tauri::command]
pub async fn delete_project(state: State<'_, DbState>, id: i64) -> Result<()> {
    database::workspace::delete_project(&state.pool, id).await
}

#[tauri::command]
pub async fn get_labels(state: State<'_, DbState>) -> Result<Vec<Label>> {
    database::workspace::get_labels(&state.pool).await
}

#[tauri::command]
pub async fn create_label(state: State<'_, DbState>, input: LabelInput) -> Result<i64> {
    database::workspace::create_label(&state.pool, input).await
}

#[tauri::command]
pub async fn update_label(state: State<'_, DbState>, id: i64, input: LabelInput) -> Result<()> {
    database::workspace::update_label(&state.pool, id, input).await
}

#[tauri::command]
pub async fn delete_label(state: State<'_, DbState>, id: i64) -> Result<()> {
    database::workspace::delete_label(&state.pool, id).await
}
