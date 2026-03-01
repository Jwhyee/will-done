use tauri::State;
use crate::models::{Workspace, UnpluggedTime, CreateWorkspaceInput, DbState};
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
