use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePool, Pool, Sqlite};
use std::fs;
use tauri::{Manager, State};

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
pub struct User {
    pub id: i64,
    pub nickname: String,
    pub gemini_api_key: Option<String>,
}

pub struct DbState {
    pub pool: Pool<Sqlite>,
}

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // 데이터베이스 초기화 (동기 실행 방지를 위해 tokio 블록 사용)
            tauri::async_runtime::block_on(async move {
                let app_dir = app_handle
                    .path()
                    .app_data_dir()
                    .expect("failed to get app data dir");
                
                if !app_dir.exists() {
                    fs::create_dir_all(&app_dir).expect("failed to create app data dir");
                }

                let db_path = app_dir.join("will-done.db");
                let db_url = format!("sqlite://{}", db_path.to_str().expect("invalid db path"));
                
                if !db_path.exists() {
                    fs::File::create(&db_path).expect("failed to create db file");
                }

                let pool = SqlitePool::connect(&db_url).await.expect("failed to connect to database");
                
                // 테이블 생성 (Migration)
                sqlx::query(
                    "CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY CHECK (id = 1),
                        nickname TEXT NOT NULL,
                        gemini_api_key TEXT
                    )"
                )
                .execute(&pool)
                .await
                .expect("failed to create users table");

                app_handle.manage(DbState { pool });
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_user, save_user, check_user_exists])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
