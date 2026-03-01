pub mod error;
pub mod models;
pub mod database;
pub mod commands;

use std::fs;
use tauri::Manager;
use sqlx::sqlite::SqlitePool;
use crate::models::DbState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
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
                
                // Migrations
                sqlx::query("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY CHECK (id = 1), nickname TEXT NOT NULL, gemini_api_key TEXT, lang TEXT NOT NULL DEFAULT 'en', last_successful_model TEXT)").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE users ADD COLUMN lang TEXT NOT NULL DEFAULT 'en'").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE users ADD COLUMN last_successful_model TEXT").execute(&pool).await.ok();
                
                sqlx::query("CREATE TABLE IF NOT EXISTS workspaces (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, core_time_start TEXT, core_time_end TEXT, role_intro TEXT)").execute(&pool).await.ok();
                sqlx::query("CREATE TABLE IF NOT EXISTS unplugged_times (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, label TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, planning_memo TEXT, estimated_minutes INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER NOT NULL DEFAULT 0").execute(&pool).await.ok();
                sqlx::query("CREATE TABLE IF NOT EXISTS time_blocks (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, status TEXT NOT NULL, review_memo TEXT, is_urgent BOOLEAN NOT NULL DEFAULT 0, FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE time_blocks ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT 0").execute(&pool).await.ok();

                sqlx::query("CREATE TABLE IF NOT EXISTS retrospectives (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, retro_type TEXT NOT NULL, content TEXT NOT NULL, date_label TEXT NOT NULL, created_at TEXT NOT NULL, used_model TEXT, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE retrospectives ADD COLUMN used_model TEXT").execute(&pool).await.ok();

                app_handle.manage(DbState { pool });
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::user::get_user, 
            commands::user::save_user, 
            commands::user::check_user_exists,
            commands::workspace::create_workspace,
            commands::workspace::get_workspaces,
            commands::workspace::get_workspace,
            commands::workspace::update_workspace,
            commands::workspace::get_unplugged_times,
            commands::timeline::get_greeting,
            commands::timeline::add_task,
            commands::timeline::get_timeline,
            commands::timeline::get_inbox,
            commands::timeline::move_to_inbox,
            commands::timeline::move_to_timeline,
            commands::timeline::move_all_to_timeline,
            commands::timeline::delete_task,
            commands::timeline::handle_split_task_deletion,
            commands::timeline::process_task_transition,
            commands::timeline::update_block_status,
            commands::timeline::reorder_blocks,
            commands::timeline::get_active_dates,
            commands::retrospective::generate_retrospective,
            commands::retrospective::get_saved_retrospectives,
            commands::retrospective::get_latest_saved_retrospective
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
