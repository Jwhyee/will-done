use crate::models::{UnpluggedTime, Workspace};
use rusqlite::{params, Connection};

#[derive(Debug, serde::Deserialize)]
pub struct UnpluggedTimeInput {
    pub label: String,
    pub start_time: String,
    pub end_time: String,
}

pub fn initialize_workspace(
    conn: &mut Connection,
    name: String,
    nickname: String,
    core_time_start: Option<String>,
    core_time_end: Option<String>,
    role_intro: String,
    unplugged_times: Vec<UnpluggedTimeInput>,
) -> Result<i64, String> {
    println!(">>> initialize_workspace START: name='{}', nickname='{}'", name, nickname);
    let tx = conn
        .transaction()
        .map_err(|e| format!("Transaction failed: {}", e))?;

    // Insert workspace
    tx.execute(
        "INSERT INTO workspaces (name, nickname, core_time_start, core_time_end, role_intro) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![name, nickname, core_time_start, core_time_end, role_intro],
    )
    .map_err(|e| format!("Insert workspace failed: {}", e))?;

    let workspace_id = tx.last_insert_rowid();
    println!(">>> Workspace created with ID: {}", workspace_id);

    // Insert unplugged times
    for ut in unplugged_times {
        println!(">>> Inserting unplugged time: label='{}', range='{} - {}'", ut.label, ut.start_time, ut.end_time);
        tx.execute(
            "INSERT INTO unplugged_times (workspace_id, label, start_time, end_time) VALUES (?1, ?2, ?3, ?4)",
            params![workspace_id, ut.label, ut.start_time, ut.end_time],
        )
        .map_err(|e| format!("Insert unplugged time failed: {}", e))?;
    }

    tx.commit()
        .map_err(|e| format!("Commit failed: {}", e))?;

    println!(">>> initialize_workspace SUCCESS: id={}", workspace_id);
    Ok(workspace_id)
}

pub fn get_current_workspace(conn: &Connection) -> Result<Option<Workspace>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, nickname, core_time_start, core_time_end, role_intro, created_at FROM workspaces ORDER BY id DESC LIMIT 1")
        .map_err(|e| format!("Prepare failed: {}", e))?;

    let result = stmt
        .query_row([], |row| {
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                nickname: row.get(2)?,
                core_time_start: row.get(3)?,
                core_time_end: row.get(4)?,
                role_intro: row.get(5)?,
                created_at: row.get(6)?,
            })
        });

    match result {
        Ok(workspace) => Ok(Some(workspace)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Query failed: {}", e)),
    }
}

pub fn get_unplugged_times(conn: &Connection, workspace_id: i64) -> Result<Vec<UnpluggedTime>, String> {
    let mut stmt = conn
        .prepare("SELECT id, workspace_id, label, start_time, end_time FROM unplugged_times WHERE workspace_id = ?1")
        .map_err(|e| format!("Prepare failed: {}", e))?;

    let rows = stmt
        .query_map([workspace_id], |row| {
            Ok(UnpluggedTime {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                label: row.get(2)?,
                start_time: row.get(3)?,
                end_time: row.get(4)?,
            })
        })
        .map_err(|e| format!("Query failed: {}", e))?;

    let mut unplugged_times = Vec::new();
    for row in rows {
        unplugged_times.push(row.map_err(|e| format!("Row failed: {}", e))?);
    }

    Ok(unplugged_times)
}
