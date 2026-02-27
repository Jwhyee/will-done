use crate::models::{Task, TimelineEntry, TaskInput};
use rusqlite::{params, Connection};
use chrono::{NaiveTime, Local, Timelike};

// Convert HH:mm to minutes from midnight
fn time_to_minutes(time_str: &str) -> Option<i64> {
    let time = NaiveTime::parse_from_str(time_str, "%H:%M").ok()?;
    Some((time.hour() as i64) * 60 + time.minute() as i64)
}

// Convert minutes from midnight to HH:mm
fn minutes_to_time(minutes: i64) -> String {
    let hours = (minutes / 60) % 24;
    let mins = minutes % 60;
    format!("{:02}:{:02}", hours, mins)
}

pub fn auto_schedule_task(
    conn: &mut Connection,
    workspace_id: i64,
    input: TaskInput,
    target_date: String, // YYYY-MM-DD
) -> Result<Task, String> {
    let task_id = {
        let tx = conn.transaction().map_err(|e| format!("Transaction failed: {}", e))?;

        // 1. Get workspace core times
        let mut stmt = tx.prepare(
            "SELECT core_time_start, core_time_end FROM workspaces WHERE id = ?1"
        ).map_err(|e| format!("Prepare failed: {}", e))?;
        
        let (core_start_min, core_end_min): (Option<i64>, Option<i64>) = stmt
            .query_row([workspace_id], |row| {
                let start: Option<String> = row.get(0)?;
                let end: Option<String> = row.get(1)?;
                Ok((start.and_then(|s| time_to_minutes(&s)), end.and_then(|e| time_to_minutes(&e))))
            })
            .map_err(|e| format!("Query failed: {}", e))?;
        drop(stmt); // Release borrow on tx

        // Default to 00:00 - 24:00 if no core time
        let day_start = core_start_min.unwrap_or(0);
        let day_end = core_end_min.unwrap_or(1440);

        // 2. Get existing time blocks for the date
        let date_prefix = format!("{}T", target_date);
        let mut stmt = tx.prepare(
            "SELECT id, task_id, start_time, end_time, status FROM time_blocks WHERE start_time LIKE ?1"
        ).map_err(|e| format!("Prepare failed: {}", e))?;
        
        let existing_blocks: Vec<(String, String)> = stmt
            .query_map([format!("{}%", date_prefix)], |row| {
                let start: String = row.get(2)?;
                let end: String = row.get(3)?;
                Ok((start, end))
            })
            .map_err(|e| format!("Query failed: {}", e))?
            .filter_map(|r| r.ok())
            .collect();
        drop(stmt); // Release borrow on tx

        // 3. Get unplugged times
        let mut stmt = tx.prepare(
            "SELECT start_time, end_time FROM unplugged_times WHERE workspace_id = ?1"
        ).map_err(|e| format!("Prepare failed: {}", e))?;
        
        let unplugged_times: Vec<(i64, i64)> = stmt
            .query_map([workspace_id], |row| {
                let start: String = row.get(0)?;
                let end: String = row.get(1)?;
                Ok((time_to_minutes(&start).unwrap_or(0), time_to_minutes(&end).unwrap_or(0)))
            })
            .map_err(|e| format!("Query failed: {}", e))?
            .filter_map(|r| r.ok())
            .collect();
        drop(stmt); // Release borrow on tx

        // 4. Find earliest available slot
        let mut current_time = day_start;
        
        // Check gaps between existing blocks
        for (block_start, block_end) in &existing_blocks {
            let block_start_min = parse_iso_time(block_start);
            let block_end_min = parse_iso_time(block_end);
            
            if current_time + input.duration_minutes <= block_start_min {
                // Found a gap before this block
                break;
            }
            current_time = block_end_min;
        }

        // Check if it fits within core time
        if current_time + input.duration_minutes > day_end {
            return Err("No available time slot within core hours".to_string());
        }

        // 5. Generate time blocks with splitting logic
        let mut blocks_to_insert: Vec<(String, String)> = Vec::new();
        let mut task_start_min = current_time;
        let task_end_min = current_time + input.duration_minutes;

        // Sort unplugged times
        let mut sorted_unplugged = unplugged_times.clone();
        sorted_unplugged.sort_by_key(|x| x.0);

        for (unplug_start, unplug_end) in sorted_unplugged {
            // If task starts before unplug ends and ends after unplug starts (overlap)
            if task_start_min < unplug_end && task_end_min > unplug_start {
                // Add block before unplugged time
                if task_start_min < unplug_start {
                    blocks_to_insert.push((
                        minutes_to_time(task_start_min),
                        minutes_to_time(unplug_start.min(task_end_min))
                    ));
                }
                // Move to after unplugged time
                task_start_min = unplug_end;
            }
        }

        // Add remaining block if any
        if task_start_min < task_end_min {
            blocks_to_insert.push((
                minutes_to_time(task_start_min),
                minutes_to_time(task_end_min)
            ));
        }

        // 6. Insert task
        tx.execute(
            "INSERT INTO tasks (workspace_id, title, planning_memo, is_urgent, status) VALUES (?1, ?2, ?3, ?4, 'Scheduled')",
            params![workspace_id, input.title, input.planning_memo, input.is_urgent as i32],
        ).map_err(|e| format!("Insert task failed: {}", e))?;

        let task_id = tx.last_insert_rowid();

        // 7. Insert time blocks
        for (start, end) in blocks_to_insert {
            let start_iso = format!("{}T{}:00", target_date, start);
            let end_iso = format!("{}T{}:00", target_date, end);
            
            tx.execute(
                "INSERT INTO time_blocks (task_id, start_time, end_time, status) VALUES (?1, ?2, ?3, 'Will')",
                params![task_id, start_iso, end_iso],
            ).map_err(|e| format!("Insert time block failed: {}", e))?;
        }

        tx.commit().map_err(|e| format!("Commit failed: {}", e))?;

        task_id
    };

    // Return created task (use conn after tx is committed)

    // Return created task
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, title, planning_memo, is_routine, is_urgent, created_at, status FROM tasks WHERE id = ?1"
    ).map_err(|e| format!("Prepare failed: {}", e))?;

    let task = stmt.query_row([task_id], |row| {
        Ok(Task {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            title: row.get(2)?,
            planning_memo: row.get(3)?,
            is_routine: row.get::<_, i32>(4)? != 0,
            is_urgent: row.get::<_, i32>(5)? != 0,
            created_at: row.get(6)?,
            status: row.get(7)?,
        })
    }).map_err(|e| format!("Query failed: {}", e))?;

    Ok(task)
}

fn parse_iso_time(iso: &str) -> i64 {
    // Parse "YYYY-MM-DDTHH:MM:SS" to minutes from midnight
    if let Some(time_part) = iso.split('T').nth(1) {
        let hm = time_part.split(':').take(2).collect::<Vec<_>>();
        if hm.len() == 2 {
            let hours: i64 = hm[0].parse().unwrap_or(0);
            let mins: i64 = hm[1].parse().unwrap_or(0);
            return hours * 60 + mins;
        }
    }
    0
}

pub fn get_timeline(conn: &Connection, workspace_id: i64, date: String) -> Result<Vec<TimelineEntry>, String> {
    let date_prefix = format!("{}T", date);

    // Get time blocks
    let mut stmt = conn.prepare(
        "SELECT tb.id, t.title, tb.start_time, tb.end_time, tb.status 
         FROM time_blocks tb 
         JOIN tasks t ON tb.task_id = t.id 
         WHERE t.workspace_id = ?1 AND tb.start_time LIKE ?2
         ORDER BY tb.start_time"
    ).map_err(|e| format!("Prepare failed: {}", e))?;

    let mut entries: Vec<TimelineEntry> = stmt
        .query_map(params![workspace_id, format!("{}%", date_prefix)], |row| {
            let id: i64 = row.get(0)?;
            let title: String = row.get(1)?;
            let start: String = row.get(2)?;
            let end: String = row.get(3)?;
            let status: String = row.get(4)?;
            Ok(TimelineEntry {
                id,
                item_type: "task".to_string(),
                title: Some(title),
                label: None,
                start_time: extract_time(&start),
                end_time: extract_time(&end),
                status: Some(status),
            })
        })
        .map_err(|e| format!("Query failed: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    // Get unplugged times
    let mut stmt = conn.prepare(
        "SELECT id, label, start_time, end_time FROM unplugged_times WHERE workspace_id = ?1"
    ).map_err(|e| format!("Prepare failed: {}", e))?;

    let unplugged: Vec<TimelineEntry> = stmt
        .query_map([workspace_id], |row| {
            let id: i64 = row.get(0)?;
            let label: String = row.get(1)?;
            let start: String = row.get(2)?;
            let end: String = row.get(3)?;
            Ok(TimelineEntry {
                id,
                item_type: "unplugged".to_string(),
                title: None,
                label: Some(label),
                start_time: start,
                end_time: end,
                status: None,
            })
        })
        .map_err(|e| format!("Query failed: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    entries.extend(unplugged);
    entries.sort_by_key(|e| e.start_time.clone());

    Ok(entries)
}

fn extract_time(iso: &str) -> String {
    if let Some(time_part) = iso.split('T').nth(1) {
        let hm = time_part.split(':').take(2).collect::<Vec<_>>();
        if hm.len() == 2 {
            return format!("{}:{}", hm[0], hm[1]);
        }
    }
    "00:00".to_string()
}

pub fn get_greeting(nickname: &str, has_active_task: bool) -> String {
    let now = Local::now();
    let hour = now.hour();

    let (greeting_idle, greeting_active) = match hour {
        6..=10 => ("morning_idle", "morning_active"),
        11..=12 => ("lunch_idle", "lunch_active"),
        13..=17 => ("afternoon_idle", "afternoon_active"),
        18..=21 => ("evening_idle", "evening_active"),
        22..=23 | 0..=3 => ("night_idle", "night_active"),
        4..=5 => ("dawn_idle", "dawn_active"),
        _ => ("morning_idle", "morning_active"),
    };

    let template = if has_active_task { greeting_active } else { greeting_idle };

    match template {
        "morning_idle" => format!("Good morning, {}. Let's plan an energetic day!", nickname),
        "morning_active" => format!("{}, great focus this morning! Is everything on track?", nickname),
        "lunch_idle" => "Great work this morning. Shall we plan the afternoon after eating?".to_string(),
        "lunch_active" => "Lunchtime is approaching. Are you wrapping up your current task?".to_string(),
        "afternoon_idle" => "Lazy afternoon. Let's set a goal for the rest of the day.".to_string(),
        "afternoon_active" => "Keep it up! Maintain the momentum on your current task.".to_string(),
        "evening_idle" => "Past clock-out time. Shall we organize for tomorrow?".to_string(),
        "evening_active" => "Working late. Pace yourself and don't overdo it.".to_string(),
        "night_idle" => "Great job today. Have a peaceful night.".to_string(),
        "night_active" => "Working the night shift! Please take a rest after this.".to_string(),
        "dawn_idle" => "Early dawn. What plan will you make in this quiet time?".to_string(),
        "dawn_active" => "An early start! Don't forget to log your progress.".to_string(),
        _ => format!("Hello, {}!", nickname),
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_time_to_minutes() {
        assert_eq!(time_to_minutes("00:00"), Some(0));
        assert_eq!(time_to_minutes("01:30"), Some(90));
        assert_eq!(time_to_minutes("12:00"), Some(720));
        assert_eq!(time_to_minutes("23:59"), Some(1439));
        assert_eq!(time_to_minutes("invalid"), None);
    }

    #[test]
    fn test_minutes_to_time() {
        assert_eq!(minutes_to_time(0), "00:00");
        assert_eq!(minutes_to_time(90), "01:30");
        assert_eq!(minutes_to_time(720), "12:00");
        assert_eq!(minutes_to_time(1439), "23:59");
        assert_eq!(minutes_to_time(1500), "01:00"); // Wraps past 24 hours
    }

    #[test]
    fn test_parse_iso_time() {
        assert_eq!(parse_iso_time("2024-01-15T09:30:00"), 570);   // 9:30 = 9*60 + 30
        assert_eq!(parse_iso_time("2024-01-15T00:00:00"), 0);
        assert_eq!(parse_iso_time("2024-01-15T23:59:00"), 1439);
        assert_eq!(parse_iso_time("invalid"), 0);
    }

    // Test splitting logic: simulate the algorithm with test inputs
    #[test]
    fn test_split_around_single_unplugged() {
        // Task: 60 min from 09:00 to 10:00
        // Unplugged: 09:30 to 10:00
        // Expected: one block - 09:00-09:30 (second block would be 10:00-10:00 which is empty)
        let task_start_min = 540; // 09:00
        let task_end_min = 600;   // 10:00
        let unplugged_times = vec![(570, 600)]; // 09:30-10:00

        let mut blocks_to_insert: Vec<(String, String)> = Vec::new();
        let mut current_task_start = task_start_min;

        let mut sorted_unplugged = unplugged_times.clone();
        sorted_unplugged.sort_by_key(|x| x.0);

        for (unplug_start, unplug_end) in sorted_unplugged {
            if current_task_start < unplug_end && task_end_min > unplug_start {
                if current_task_start < unplug_start {
                    blocks_to_insert.push((
                        minutes_to_time(current_task_start),
                        minutes_to_time(unplug_start.min(task_end_min))
                    ));
                }
                current_task_start = unplug_end;
            }
        }

        if current_task_start < task_end_min {
            blocks_to_insert.push((
                minutes_to_time(current_task_start),
                minutes_to_time(task_end_min)
            ));
        }

        // After unplug (10:00) == task_end_min (10:00), so no second block
        assert_eq!(blocks_to_insert.len(), 1);
        assert_eq!(blocks_to_insert[0], ("09:00".to_string(), "09:30".to_string()));
    }

    #[test]
    fn test_split_around_multiple_unplugged() {
        // Task: 120 min from 08:00 to 10:00
        // Unplugged: 08:30-09:00 and 09:30-10:00
        // Expected: two blocks - 08:00-08:30 and 09:00-09:30 (third would be 10:00-10:00 empty)
        let task_start_min = 480; // 08:00
        let task_end_min = 600;   // 10:00
        // (510,540) = 08:30-09:00, (570,600) = 09:30-10:00
        let unplugged_times = vec![(570, 600), (510, 540)]; // Out of order

        let mut blocks_to_insert: Vec<(String, String)> = Vec::new();
        let mut current_task_start = task_start_min;

        let mut sorted_unplugged = unplugged_times.clone();
        sorted_unplugged.sort_by_key(|x| x.0);

        for (unplug_start, unplug_end) in sorted_unplugged {
            if current_task_start < unplug_end && task_end_min > unplug_start {
                if current_task_start < unplug_start {
                    blocks_to_insert.push((
                        minutes_to_time(current_task_start),
                        minutes_to_time(unplug_start.min(task_end_min))
                    ));
                }
                current_task_start = unplug_end;
            }
        }

        if current_task_start < task_end_min {
            blocks_to_insert.push((
                minutes_to_time(current_task_start),
                minutes_to_time(task_end_min)
            ));
        }

        assert_eq!(blocks_to_insert.len(), 2);
        assert_eq!(blocks_to_insert[0], ("08:00".to_string(), "08:30".to_string()));
        assert_eq!(blocks_to_insert[1], ("09:00".to_string(), "09:30".to_string()));
    }

    #[test]
    fn test_no_split_when_no_overlap() {
        // Task: 60 min from 10:00 to 11:00
        // Unplugged: 08:00-09:00 (no overlap)
        // Expected: one block 10:00-11:00
        let task_start_min = 600; // 10:00
        let task_end_min = 660;   // 11:00
        let unplugged_times = vec![(480, 540)]; // 08:00-09:00

        let mut blocks_to_insert: Vec<(String, String)> = Vec::new();
        let mut current_task_start = task_start_min;

        let mut sorted_unplugged = unplugged_times.clone();
        sorted_unplugged.sort_by_key(|x| x.0);

        for (unplug_start, unplug_end) in sorted_unplugged {
            if current_task_start < unplug_end && task_end_min > unplug_start {
                if current_task_start < unplug_start {
                    blocks_to_insert.push((
                        minutes_to_time(current_task_start),
                        minutes_to_time(unplug_start.min(task_end_min))
                    ));
                }
                current_task_start = unplug_end;
            }
        }

        if current_task_start < task_end_min {
            blocks_to_insert.push((
                minutes_to_time(current_task_start),
                minutes_to_time(task_end_min)
            ));
        }

        assert_eq!(blocks_to_insert.len(), 1);
        assert_eq!(blocks_to_insert[0], ("10:00".to_string(), "11:00".to_string()));
    }

    #[test]
    fn test_task_completely_inside_unplugged() {
        // Task: 60 min from 09:00 to 10:00
        // Unplugged: 08:30-10:30 (task completely inside)
        // Expected: zero blocks (task cannot be scheduled - no available time after unplug)
        let task_start_min = 540; // 09:00
        let task_end_min = 600;   // 10:00
        let unplugged_times = vec![(510, 630)]; // 08:30-10:30

        let mut blocks_to_insert: Vec<(String, String)> = Vec::new();
        let mut current_task_start = task_start_min;

        let mut sorted_unplugged = unplugged_times.clone();
        sorted_unplugged.sort_by_key(|x| x.0);

        for (unplug_start, unplug_end) in sorted_unplugged {
            if current_task_start < unplug_end && task_end_min > unplug_start {
                if current_task_start < unplug_start {
                    blocks_to_insert.push((
                        minutes_to_time(current_task_start),
                        minutes_to_time(unplug_start.min(task_end_min))
                    ));
                }
                current_task_start = unplug_end;
            }
        }

        if current_task_start < task_end_min {
            blocks_to_insert.push((
                minutes_to_time(current_task_start),
                minutes_to_time(task_end_min)
            ));
        }

        // No blocks because task_start moved to 630 (after unplug) but task_end is 600
        assert_eq!(blocks_to_insert.len(), 0);
    }
}
