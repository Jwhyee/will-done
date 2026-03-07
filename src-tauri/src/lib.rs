pub mod domain;
pub mod database;
pub mod commands;

use std::fs;
use tauri::{Manager, Emitter, Listener};
use sqlx::sqlite::SqlitePool;
use serde_json;
use crate::domain::DbState;

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
                        sqlx::query("DELETE FROM tasks").execute(&pool).await.ok();
                        sqlx::query("DELETE FROM projects").execute(&pool).await.ok();
                        sqlx::query("DELETE FROM labels").execute(&pool).await.ok();
                        sqlx::query("DELETE FROM unplugged_times").execute(&pool).await.ok();
                        sqlx::query("DELETE FROM workspaces").execute(&pool).await.ok();
                        sqlx::query("DELETE FROM users").execute(&pool).await.ok();
                        println!("✅ [Dev Mode] Database cleared.");
                    }

                    if args.contains(&"init".to_string()) {
                        println!("🚀 [Dev Mode] Seeding database...");
                        
                        // 1. User & Workspace
                        sqlx::query("INSERT INTO users (id, nickname, gemini_api_key, lang, is_notification_enabled, day_start_time) VALUES (1, 'TEST', 'dummy_key', 'ko', 1, '04:00')").execute(&pool).await.ok();
                        sqlx::query("INSERT INTO workspaces (id, name, core_time_start, core_time_end) VALUES (1, 'HOME', '10:00', '20:00')").execute(&pool).await.ok();

                        // 1.1 Unplugged Times
                        sqlx::query("INSERT INTO unplugged_times (workspace_id, label, start_time, end_time) VALUES (1, '점심시간', '12:00', '13:00')").execute(&pool).await.ok();
                        sqlx::query("INSERT INTO unplugged_times (workspace_id, label, start_time, end_time) VALUES (1, '저녁시간', '18:00', '19:00')").execute(&pool).await.ok();

                        // 2. Tasks & TimeBlocks (Today & Yesterday)
                        let now = chrono::Local::now();
                        let day_start_time = "04:00";
                        let today_logical = if now.format("%H:%M").to_string() < day_start_time.to_string() {
                            now.date_naive() - chrono::Duration::days(1)
                        } else {
                            now.date_naive()
                        };
                        let yesterday_logical = today_logical - chrono::Duration::days(1);
                        let now_str = now.format("%Y-%m-%dT%H:%M:%S").to_string();

                        for (i, logical_date) in [yesterday_logical, today_logical].iter().enumerate() {
                            let offset = (i as i64) * 100;
                            let date_str = logical_date.format("%Y-%m-%d").to_string();

                            // Insert Tasks
                            sqlx::query("INSERT INTO tasks (id, workspace_id, title, estimated_minutes) VALUES (?, 1, '모각코 스터디 진행', 60)").bind(10 + offset).execute(&pool).await.ok();
                            sqlx::query("INSERT INTO tasks (id, workspace_id, title, estimated_minutes) VALUES (?, 1, '백트래킹 알고리즘 문제 풀이', 60)").bind(11 + offset).execute(&pool).await.ok();
                            sqlx::query("INSERT INTO tasks (id, workspace_id, title, estimated_minutes) VALUES (?, 1, '[Will Done] 일일 회고 개발 진행', 30)").bind(12 + offset).execute(&pool).await.ok();
                            sqlx::query("INSERT INTO tasks (id, workspace_id, title, estimated_minutes) VALUES (?, 1, '[Will Done] 태스크 개발 진행', 20)").bind(13 + offset).execute(&pool).await.ok();
                            sqlx::query("INSERT INTO tasks (id, workspace_id, title, estimated_minutes) VALUES (?, 1, '[Will Done] UI 컴포넌트 고도화', 70)").bind(14 + offset).execute(&pool).await.ok();
                            sqlx::query("INSERT INTO tasks (id, workspace_id, title, estimated_minutes) VALUES (?, 1, '[Will Done] 데이터베이스 마이그레이션 로직 작성', 90)").bind(15 + offset).execute(&pool).await.ok();
                            sqlx::query("INSERT INTO tasks (id, workspace_id, title, estimated_minutes) VALUES (?, 1, '[Will Done] API 연동 및 에러 핸들링', 90)").bind(16 + offset).execute(&pool).await.ok();
                            sqlx::query("INSERT INTO tasks (id, workspace_id, title, estimated_minutes) VALUES (?, 1, '[Will Done] 코드 리뷰 및 리팩토링', 60)").bind(17 + offset).execute(&pool).await.ok();

                            // Helper for status
                            let get_status = |start: &str, end: &str| {
                                if *logical_date < today_logical { return "DONE"; }
                                if now_str < start.to_string() { return "WILL"; }
                                if now_str >= end.to_string() { return "DONE"; }
                                "NOW"
                            };

                            // Block 1: 모각코 (10:00 - 11:00)
                            let s1 = format!("{}T10:00:00", date_str);
                            let e1 = format!("{}T11:00:00", date_str);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?, 1, '모각코 스터디 진행', ?, ?, ?)")
                                .bind(10 + offset).bind(&s1).bind(&e1).bind(get_status(&s1, &e1)).execute(&pool).await.ok();

                            // Block 2: 백트래킹 (11:00 - 12:00)
                            let s2 = format!("{}T11:00:00", date_str);
                            let e2 = format!("{}T12:00:00", date_str);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?, 1, '백트래킹 알고리즘 문제 풀이', ?, ?, ?)")
                                .bind(11 + offset).bind(&s2).bind(&e2).bind(get_status(&s2, &e2)).execute(&pool).await.ok();

                            // Block 3: 일일 회고 Part 1 (13:00 - 13:10)
                            let s3 = format!("{}T13:00:00", date_str);
                            let e3 = format!("{}T13:10:00", date_str);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?, 1, '[Will Done] 일일 회고 개발 진행', ?, ?, ?)")
                                .bind(12 + offset).bind(&s3).bind(&e3).bind(get_status(&s3, &e3)).execute(&pool).await.ok();

                            // Block 4: 태스크 개발 (Urgent) (13:10 - 13:30)
                            let s4 = format!("{}T13:10:00", date_str);
                            let e4 = format!("{}T13:30:00", date_str);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status, is_urgent) VALUES (?, 1, '[Will Done] 태스크 개발 진행', ?, ?, ?, 1)")
                                .bind(13 + offset).bind(&s4).bind(&e4).bind(get_status(&s4, &e4)).execute(&pool).await.ok();

                            // Block 5: 일일 회고 Part 2 (13:30 - 13:50)
                            let s5 = format!("{}T13:30:00", date_str);
                            let e5 = format!("{}T13:50:00", date_str);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?, 1, '[Will Done] 일일 회고 개발 진행', ?, ?, ?)")
                                .bind(12 + offset).bind(&s5).bind(&e5).bind(get_status(&s5, &e5)).execute(&pool).await.ok();

                            // Block 6: UI 컴포넌트 (13:50 - 15:00)
                            let s6 = format!("{}T13:50:00", date_str);
                            let e6 = format!("{}T15:00:00", date_str);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?, 1, '[Will Done] UI 컴포넌트 고도화', ?, ?, ?)")
                                .bind(14 + offset).bind(&s6).bind(&e6).bind(get_status(&s6, &e6)).execute(&pool).await.ok();

                            // Block 7: DB 마이그레이션 (15:00 - 16:30)
                            let s7 = format!("{}T15:00:00", date_str);
                            let e7 = format!("{}T16:30:00", date_str);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?, 1, '[Will Done] 데이터베이스 마이그레이션 로직 작성', ?, ?, ?)")
                                .bind(15 + offset).bind(&s7).bind(&e7).bind(get_status(&s7, &e7)).execute(&pool).await.ok();

                            // Block 8: API 연동 (16:30 - 18:00)
                            let s8 = format!("{}T16:30:00", date_str);
                            let e8 = format!("{}T18:00:00", date_str);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?, 1, '[Will Done] API 연동 및 에러 핸들링', ?, ?, ?)")
                                .bind(16 + offset).bind(&s8).bind(&e8).bind(get_status(&s8, &e8)).execute(&pool).await.ok();

                            // Block 9: 코드 리뷰 (19:00 - 20:00)
                            let s9 = format!("{}T19:00:00", date_str);
                            let e9 = format!("{}T20:00:00", date_str);
                            sqlx::query("INSERT INTO time_blocks (task_id, workspace_id, title, start_time, end_time, status) VALUES (?, 1, '[Will Done] 코드 리뷰 및 리팩토링', ?, ?, ?)")
                                .bind(17 + offset).bind(&s9).bind(&e9).bind(get_status(&s9, &e9)).execute(&pool).await.ok();
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
                sqlx::query("CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, last_used TEXT NOT NULL)").execute(&pool).await.ok();
                sqlx::query("CREATE TABLE IF NOT EXISTS labels (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT NOT NULL, last_used TEXT NOT NULL)").execute(&pool).await.ok();

                sqlx::query("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, planning_memo TEXT, estimated_minutes INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER NOT NULL DEFAULT 0").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects (id) ON DELETE SET NULL").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE tasks ADD COLUMN label_id INTEGER REFERENCES labels (id) ON DELETE SET NULL").execute(&pool).await.ok();
                sqlx::query("CREATE TABLE IF NOT EXISTS time_blocks (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, status TEXT NOT NULL, review_memo TEXT, is_urgent BOOLEAN NOT NULL DEFAULT 0, FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE time_blocks ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT 0").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE time_blocks ADD COLUMN planning_memo TEXT").execute(&pool).await.ok();

                sqlx::query("CREATE TABLE IF NOT EXISTS retrospectives (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, retro_type TEXT NOT NULL, content TEXT NOT NULL, date_label TEXT NOT NULL, created_at TEXT NOT NULL, used_model TEXT, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.ok();
                sqlx::query("ALTER TABLE retrospectives ADD COLUMN used_model TEXT").execute(&pool).await.ok();

                sqlx::query("DROP TABLE IF EXISTS recurring_tasks").execute(&pool).await.ok();

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
            commands::workspace::suggest_task_titles,
            commands::workspace::get_projects,
            commands::workspace::create_project,
            commands::workspace::update_project,
            commands::workspace::delete_project,
            commands::workspace::get_labels,
            commands::workspace::create_label,
            commands::workspace::update_label,
            commands::workspace::delete_label,
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
            commands::timeline::move_task_step,
            commands::timeline::move_task_to_priority,
            commands::timeline::move_task_to_bottom,
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
