use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePool, Pool, Sqlite, Row};
use std::fs;
use tauri::{Manager, State};

// --- Entities ---

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
pub struct User {
    pub id: i64,
    pub nickname: String,
    pub gemini_api_key: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
pub struct Workspace {
    pub id: i64,
    pub name: String,
    pub core_time_start: Option<String>, // HH:mm
    pub core_time_end: Option<String>,   // HH:mm
    pub role_intro: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
pub struct UnpluggedTime {
    pub id: i64,
    pub workspace_id: i64,
    pub label: String,
    pub start_time: String, // HH:mm
    pub end_time: String,   // HH:mm
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CreateWorkspaceInput {
    pub name: String,
    pub core_time_start: Option<String>,
    pub core_time_end: Option<String>,
    pub role_intro: Option<String>,
    pub unplugged_times: Vec<UnpluggedTimeInput>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UnpluggedTimeInput {
    pub label: String,
    pub start_time: String,
    pub end_time: String,
}

pub struct DbState {
    pub pool: Pool<Sqlite>,
}

// --- Commands ---

#[tauri::command]
async fn get_user(state: State<'_, DbState>) -> Result<Option<User>, String> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = 1")
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(user)
}

#[tauri::command]
async fn save_user(
    state: State<'_, DbState>,
    nickname: String,
    gemini_api_key: Option<String>,
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO users (id, nickname, gemini_api_key) 
         VALUES (1, ?1, ?2) 
         ON CONFLICT(id) DO UPDATE SET nickname=?1, gemini_api_key=?2",
    )
    .bind(nickname)
    .bind(gemini_api_key)
    .execute(&state.pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn check_user_exists(state: State<'_, DbState>) -> Result<bool, String> {
    let result = sqlx::query("SELECT 1 FROM users WHERE id = 1")
        .fetch_optional(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(result.is_some())
}

#[tauri::command]
async fn create_workspace(
    state: State<'_, DbState>,
    input: CreateWorkspaceInput,
) -> Result<i64, String> {
    let mut tx = state.pool.begin().await.map_err(|e| e.to_string())?;

    // 1. Workspace 저장
    let result = sqlx::query(
        "INSERT INTO workspaces (name, core_time_start, core_time_end, role_intro) 
         VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(&input.name)
    .bind(&input.core_time_start)
    .bind(&input.core_time_end)
    .bind(&input.role_intro)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let workspace_id = result.last_insert_rowid();

    // 2. Unplugged Times 저장
    for ut in input.unplugged_times {
        sqlx::query(
            "INSERT INTO unplugged_times (workspace_id, label, start_time, end_time) 
             VALUES (?1, ?2, ?3, ?4)",
        )
        .bind(workspace_id)
        .bind(ut.label)
        .bind(ut.start_time)
        .bind(ut.end_time)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(workspace_id)
}

#[tauri::command]
async fn get_workspaces(state: State<'_, DbState>) -> Result<Vec<Workspace>, String> {
    let workspaces = sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces")
        .fetch_all(&state.pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(workspaces)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let app_dir = app_handle.path().app_data_dir().expect("failed to get app data dir");
                if !app_dir.exists() {
                    fs::create_dir_all(&app_dir).expect("failed to create app data dir");
                }
                let db_path = app_dir.join("will-done.db");
                let db_url = format!("sqlite://{}", db_path.to_str().expect("invalid db path"));
                if !db_path.exists() {
                    fs::File::create(&db_path).expect("failed to create db file");
                }
                let pool = SqlitePool::connect(&db_url).await.expect("failed to connect to database");
                
                if cfg!(debug_assertions) {
                    println!("Debug mode: Dropping and recreating tables.");
                    sqlx::query("DROP TABLE IF EXISTS unplugged_times").execute(&pool).await.ok();
                    sqlx::query("DROP TABLE IF EXISTS workspaces").execute(&pool).await.ok();
                    sqlx::query("DROP TABLE IF EXISTS users").execute(&pool).await.ok();
                }

                // 테이블 생성
                sqlx::query(
                    "CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY CHECK (id = 1),
                        nickname TEXT NOT NULL,
                        gemini_api_key TEXT
                    )"
                ).execute(&pool).await.expect("failed to create users table");

                sqlx::query(
                    "CREATE TABLE IF NOT EXISTS workspaces (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        core_time_start TEXT,
                        core_time_end TEXT,
                        role_intro TEXT
                    )"
                ).execute(&pool).await.expect("failed to create workspaces table");

                sqlx::query(
                    "CREATE TABLE IF NOT EXISTS unplugged_times (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        workspace_id INTEGER NOT NULL,
                        label TEXT NOT NULL,
                        start_time TEXT NOT NULL,
                        end_time TEXT NOT NULL,
                        FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
                    )"
                ).execute(&pool).await.expect("failed to create unplugged_times table");

                app_handle.manage(DbState { pool });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_user, 
            save_user, 
            check_user_exists,
            create_workspace,
            get_workspaces
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePool;

    #[tokio::test]
    async fn test_create_workspace_transaction() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        
        sqlx::query(
            "CREATE TABLE workspaces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                core_time_start TEXT,
                core_time_end TEXT,
                role_intro TEXT
            )"
        ).execute(&pool).await.unwrap();

        sqlx::query(
            "CREATE TABLE unplugged_times (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workspace_id INTEGER NOT NULL,
                label TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                FOREIGN KEY (workspace_id) REFERENCES workspaces (id)
            )"
        ).execute(&pool).await.unwrap();

        let input = CreateWorkspaceInput {
            name: "Test Workspace".to_string(),
            core_time_start: Some("09:00".to_string()),
            core_time_end: Some("18:00".to_string()),
            role_intro: Some("Software Engineer".to_string()),
            unplugged_times: vec![
                UnpluggedTimeInput {
                    label: "Lunch".to_string(),
                    start_time: "12:00".to_string(),
                    end_time: "13:00".to_string(),
                }
            ],
        };

        let mut tx = pool.begin().await.unwrap();
        let result = sqlx::query(
            "INSERT INTO workspaces (name, core_time_start, core_time_end, role_intro) VALUES (?1, ?2, ?3, ?4)"
        )
        .bind(&input.name)
        .bind(&input.core_time_start)
        .bind(&input.core_time_end)
        .bind(&input.role_intro)
        .execute(&mut *tx)
        .await
        .unwrap();

        let workspace_id = result.last_insert_rowid();

        for ut in input.unplugged_times {
            sqlx::query(
                "INSERT INTO unplugged_times (workspace_id, label, start_time, end_time) VALUES (?1, ?2, ?3, ?4)"
            )
            .bind(workspace_id)
            .bind(ut.label)
            .bind(ut.start_time)
            .bind(ut.end_time)
            .execute(&mut *tx)
            .await
            .unwrap();
        }

        tx.commit().await.unwrap();

        let ws = sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces WHERE id = ?1")
            .bind(workspace_id)
            .fetch_one(&pool)
            .await
            .unwrap();

        assert_eq!(ws.name, "Test Workspace");

        let ut_count: (i64, i64) = sqlx::query_as("SELECT COUNT(*), 1 as dummy FROM unplugged_times WHERE workspace_id = ?1")
            .bind(workspace_id)
            .fetch_one(&pool)
            .await
            .unwrap();

        assert_eq!(ut_count.0, 1);
    }
}
