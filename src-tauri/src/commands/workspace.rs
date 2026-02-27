use crate::models::{UnpluggedTime, Workspace};
use crate::usecases::workspace::{initialize_workspace, get_current_workspace as fetch_current_workspace, get_unplugged_times, UnpluggedTimeInput};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, serde::Serialize)]
pub struct WorkspaceWithUnplugged {
    #[serde(flatten)]
    pub workspace: Workspace,
    pub unplugged_times: Vec<UnpluggedTime>,
}

#[tauri::command]
pub fn setup_workspace(
    name: String,
    nickname: String,
    core_time_start: Option<String>,
    core_time_end: Option<String>,
    role_intro: String,
    unplugged_times: Vec<UnpluggedTimeInput>,
    state: State<'_, Mutex<Connection>>,
) -> Result<i64, String> {
    let core_time_start = if core_time_start.as_deref() == Some("") { None } else { core_time_start };
    let core_time_end = if core_time_end.as_deref() == Some("") { None } else { core_time_end };
    let mut conn = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    initialize_workspace(
        &mut conn,
        name,
        nickname,
        core_time_start,
        core_time_end,
        role_intro,
        unplugged_times,
    )
}

#[tauri::command]
pub fn get_current_workspace(
    state: State<'_, Mutex<Connection>>,
) -> Result<Option<WorkspaceWithUnplugged>, String> {
    let conn = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    let workspace = fetch_current_workspace(&conn)?;

    match workspace {
        Some(ws) => {
            let unplugged = get_unplugged_times(&conn, ws.id)?;
            Ok(Some(WorkspaceWithUnplugged {
                workspace: ws,
                unplugged_times: unplugged,
            }))
        }
        None => Ok(None),
    }
}
