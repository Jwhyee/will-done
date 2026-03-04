pub mod error;
pub mod models;
pub mod database;
pub mod commands;

use std::fs;
use tauri::{Manager, Emitter, Listener};
use sqlx::sqlite::SqlitePool;
use serde_json;
use crate::models::DbState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let listener_handle = app_handle.clone();
            
            // Handle notification click via global event
            app.listen("tauri://notification-action", move |event: tauri::Event| {
                // The payload for tauri://notification-action is a JSON string
                if let Ok(payload) = serde_json::from_str::<serde_json::Value>(event.payload()) {
                    if let Some(notification) = payload.get("notification") {
                        if let Some(id_val) = notification.get("id") {
                            let block_id = if let Some(id_num) = id_val.as_i64() {
                                Some(id_num)
                            } else if let Some(id_str) = id_val.as_str() {
                                id_str.parse::<i64>().ok()
                            } else {
                                None
                            };

                            if let Some(bid) = block_id {
                                listener_handle.emit("open-transition-modal", bid).ok();
                            }
                        }
                    }
                }
                if let Some(window) = listener_handle.get_webview_window("main") {
                    let _ = window.set_focus();
                }
            });

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
                
                // Enable foreign keys
                sqlx::query("PRAGMA foreign_keys = ON").execute(&pool).await.ok();

                #[cfg(debug_assertions)]
                {
                    let args: Vec<String> = std::env::args().collect();
                    if args.contains(&"clear".to_string()) || args.contains(&"init".to_string()) {
                        println!("🚀 [Dev Mode] Cleaning database...");
                        sqlx::query("DELETE FROM retrospectives").execute(&pool).await.ok();
                        sqlx::query("DELETE FROM time_blocks").execute(&pool).await.ok();
                        sqlx::query("DELETE FROM recurring_tasks").execute(&pool).await.ok();
                        sqlx::query("DELETE FROM tasks").execute(&pool).await.ok();
                        sqlx::query("DELETE FROM unplugged_times").execute(&pool).await.ok();
                        sqlx::query("DELETE FROM workspaces").execute(&pool).await.ok();
                        sqlx::query("DELETE FROM users").execute(&pool).await.ok();
                        println!("✅ [Dev Mode] Database cleared.");
                    }

                    if args.contains(&"init".to_string()) {
                        println!("🚀 [Dev Mode] Seeding database...");
                        
                        // 1. User & Workspace
                        sqlx::query("INSERT INTO users (id, nickname, gemini_api_key, lang, is_notification_enabled, day_start_time) VALUES (1, 'TEST', 'dummy_key', 'ko', 1, '04:00')").execute(&pool).await.ok();
                        sqlx::query("INSERT INTO workspaces (id, name) VALUES (1, 'HOME')").execute(&pool).await.ok();

                        // 2. Tasks & TimeBlocks (Today & Yesterday)
                        let now = chrono::Local::now();
                        let day_start_time = "04:00";
                        let today_logical = if now.format("%H:%M").to_string() < day_start_time.to_string() {
                            now.date_naive() - chrono::Duration::days(1)
                        } else {
                            now.date_naive()
                        };
                        let yesterday_logical = today_logical - chrono::Duration::days(1);

                        for (i, logical_date) in [yesterday_logical, today_logical].iter().enumerate() {
                            let base_time = chrono::NaiveDateTime::parse_from_str(&format!("{}T09:00:00", logical_date.format("%Y-%m-%d")), "%Y-%m-%dT%H:%M:%S").unwrap();
                            let offset = (i as i64) * 100;

                            // Insert Tasks
                            sqlx::query("INSERT INTO tasks (id, workspace_id, title, estimated_minutes) VALUES (?, 1, '기획서 작성', 60)").bind(10 + offset).execute(&pool).await.ok();
                            sqlx::query("INSERT INTO tasks (id, workspace_id, title, estimated_minutes) VALUES (?, 1, '🔥 서버 장애 대응', 30)").bind(11 + offset).execute(&pool).await.ok();
                            sqlx::query("INSERT INTO tasks (id, workspace_id, title, estimated_minutes) VALUES (?, 1, '주간 회의', 60)").bind(12 + offset).execute(&pool).await.ok();
                            sqlx::query("INSERT INTO tasks (id, workspace_id, title, estimated_minutes) VALUES (?, 1, '이메일 회신', 30)").bind(13 + offset).execute(&pool).await.ok();

                            // Block 1: Task A Part 1 (09:00 - 09:30)
                            let s1 = base_time;
                            let e1 = s1 + chrono::Duration::minutes(30);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?, 1, '기획서 작성', ?, ?, 'DONE')")
                                .bind(10 + offset).bind(s1.format("%Y-%m-%dT%H:%M:%S").to_string()).bind(e1.format("%Y-%m-%dT%H:%M:%S").to_string()).execute(&pool).await.ok();

                            // Block 2: Urgent Task B (09:30 - 10:00)
                            let s2 = e1;
                            let e2 = s2 + chrono::Duration::minutes(30);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status, is_urgent) VALUES (?, 1, '🔥 서버 장애 대응', ?, ?, 'DONE', 1)")
                                .bind(11 + offset).bind(s2.format("%Y-%m-%dT%H:%M:%S").to_string()).bind(e2.format("%Y-%m-%dT%H:%M:%S").to_string()).execute(&pool).await.ok();

                            // Block 3: Task A Part 2 (10:00 - 10:30)
                            let s3 = e2;
                            let e3 = s3 + chrono::Duration::minutes(30);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?, 1, '기획서 작성', ?, ?, 'DONE')")
                                .bind(10 + offset).bind(s3.format("%Y-%m-%dT%H:%M:%S").to_string()).bind(e3.format("%Y-%m-%dT%H:%M:%S").to_string()).execute(&pool).await.ok();

                            // Block 4: Task C (10:30 - 11:30)
                            let s4 = e3;
                            let e4 = s4 + chrono::Duration::minutes(60);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?, 1, '주간 회의', ?, ?, 'DONE')")
                                .bind(12 + offset).bind(s4.format("%Y-%m-%dT%H:%M:%S").to_string()).bind(e4.format("%Y-%m-%dT%H:%M:%S").to_string()).execute(&pool).await.ok();

                            // Block 5: Task D (11:30 - 12:00)
                            let s5 = e4;
                            let e5 = s5 + chrono::Duration::minutes(30);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?, 1, '이메일 회신', ?, ?, 'DONE')")
                                .bind(13 + offset).bind(s5.format("%Y-%m-%dT%H:%M:%S").to_string()).bind(e5.format("%Y-%m-%dT%H:%M:%S").to_string()).execute(&pool).await.ok();
                        }
                        println!("✅ [Dev Mode] Database seeded successfully.");
                    }
                }
                
                // Migrations
                sqlx::query("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY CHECK (id = 1), nickname TEXT NOT NULL, gemini_api_key TEXT, lang TEXT NOT NULL DEFAULT 'en', last_successful_model TEXT, is_notification_enabled BOOLEAN NOT NULL DEFAULT 0, day_start_time TEXT NOT NULL DEFAULT '04:00')").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE users ADD COLUMN lang TEXT NOT NULL DEFAULT 'en'").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE users ADD COLUMN last_successful_model TEXT").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE users ADD COLUMN is_notification_enabled BOOLEAN NOT NULL DEFAULT 0").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE users ADD COLUMN day_start_time TEXT NOT NULL DEFAULT '04:00'").execute(&pool).await.ok();
                
                sqlx::query("CREATE TABLE IF NOT EXISTS workspaces (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, core_time_start TEXT, core_time_end TEXT, role_intro TEXT)").execute(&pool).await.ok();
                sqlx::query("CREATE TABLE IF NOT EXISTS unplugged_times (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, label TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, planning_memo TEXT, estimated_minutes INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER NOT NULL DEFAULT 0").execute(&pool).await.ok();
                sqlx::query("CREATE TABLE IF NOT EXISTS time_blocks (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, status TEXT NOT NULL, review_memo TEXT, is_urgent BOOLEAN NOT NULL DEFAULT 0, FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE time_blocks ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT 0").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE time_blocks ADD COLUMN planning_memo TEXT").execute(&pool).await.ok();

                sqlx::query("CREATE TABLE IF NOT EXISTS retrospectives (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, retro_type TEXT NOT NULL, content TEXT NOT NULL, date_label TEXT NOT NULL, created_at TEXT NOT NULL, used_model TEXT, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE retrospectives ADD COLUMN used_model TEXT").execute(&pool).await.ok();

                sqlx::query("CREATE TABLE IF NOT EXISTS recurring_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, planning_memo TEXT, duration INTEGER NOT NULL DEFAULT 0, days_of_week TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();

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
            commands::workspace::delete_workspace,
            commands::workspace::get_unplugged_times,
            commands::workspace::get_recurring_tasks,
            commands::workspace::add_recurring_task,
            commands::workspace::delete_recurring_task,
            commands::timeline::get_greeting,
            commands::timeline::add_task,
            commands::timeline::get_timeline,
            commands::timeline::get_inbox,
            commands::timeline::update_task,
            commands::timeline::move_to_inbox,
            commands::timeline::move_to_timeline,
            commands::timeline::move_all_to_timeline,
            commands::timeline::delete_task,
            commands::timeline::handle_split_task_deletion,
            commands::timeline::process_task_transition,
            commands::timeline::update_block_status,
            commands::timeline::reorder_blocks,
            commands::timeline::get_active_dates,
            commands::timeline::get_today_completed_duration,
            commands::retrospective::generate_retrospective,
            commands::retrospective::get_saved_retrospectives,
            commands::retrospective::get_latest_saved_retrospective,
            commands::retrospective::fetch_available_models
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
