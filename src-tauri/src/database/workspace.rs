use sqlx::SqlitePool;
use crate::models::{Workspace, UnpluggedTime, CreateWorkspaceInput, RecurringTask, CreateRecurringTaskInput};
use crate::error::Result;

pub async fn get_workspaces(pool: &SqlitePool) -> Result<Vec<Workspace>> {
    let workspaces = sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces")
        .fetch_all(pool)
        .await?;
    Ok(workspaces)
}

pub async fn get_workspace(pool: &SqlitePool, id: i64) -> Result<Option<Workspace>> {
    let ws = sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces WHERE id = ?1")
        .bind(id)
        .fetch_optional(pool)
        .await?;
    Ok(ws)
}

pub async fn create_workspace(
    pool: &SqlitePool,
    input: CreateWorkspaceInput,
) -> Result<i64> {
    let mut tx = pool.begin().await?;
    let result = sqlx::query(
        "INSERT INTO workspaces (name, core_time_start, core_time_end, role_intro) VALUES (?1, ?2, ?3, ?4)",
    )
    .bind(&input.name)
    .bind(&input.core_time_start)
    .bind(&input.core_time_end)
    .bind(&input.role_intro)
    .execute(&mut *tx)
    .await?;

    let workspace_id = result.last_insert_rowid();

    for ut in input.unplugged_times {
        sqlx::query(
            "INSERT INTO unplugged_times (workspace_id, label, start_time, end_time) VALUES (?1, ?2, ?3, ?4)",
        )
        .bind(workspace_id)
        .bind(ut.label)
        .bind(ut.start_time)
        .bind(ut.end_time)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(recurring_tasks) = input.recurring_tasks {
        let created_at = chrono::Local::now().to_rfc3339();
        for rt in recurring_tasks {
            let days_of_week_json = serde_json::to_string(&rt.days_of_week)?;
            sqlx::query(
                "INSERT INTO recurring_tasks (workspace_id, title, planning_memo, duration, days_of_week, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            )
            .bind(workspace_id)
            .bind(rt.title)
            .bind(rt.planning_memo)
            .bind(rt.duration)
            .bind(days_of_week_json)
            .bind(&created_at)
            .execute(&mut *tx)
            .await?;
        }
    }

    tx.commit().await?;
    Ok(workspace_id)
}

pub async fn get_unplugged_times(pool: &SqlitePool, workspace_id: i64) -> Result<Vec<UnpluggedTime>> {
    let list = sqlx::query_as::<_, UnpluggedTime>("SELECT * FROM unplugged_times WHERE workspace_id = ?1")
        .bind(workspace_id)
        .fetch_all(pool)
        .await?;
    Ok(list)
}

pub async fn update_workspace(
    pool: &SqlitePool,
    id: i64,
    mut input: CreateWorkspaceInput,
) -> Result<()> {
    let mut tx = pool.begin().await?;
    sqlx::query(
        "UPDATE workspaces SET name=?1, core_time_start=?2, core_time_end=?3, role_intro=?4 WHERE id=?5",
    )
    .bind(&input.name)
    .bind(&input.core_time_start)
    .bind(&input.core_time_end)
    .bind(&input.role_intro)
    .bind(id)
    .execute(&mut *tx)
    .await?;

    sqlx::query("DELETE FROM unplugged_times WHERE workspace_id = ?1")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    for ut in input.unplugged_times {
        sqlx::query(
            "INSERT INTO unplugged_times (workspace_id, label, start_time, end_time) VALUES (?1, ?2, ?3, ?4)",
        )
        .bind(id)
        .bind(ut.label)
        .bind(ut.start_time)
        .bind(ut.end_time)
        .execute(&mut *tx)
        .await?;
    }

    if let Some(recurring_tasks) = input.recurring_tasks {
        let created_at = chrono::Local::now().to_rfc3339();
        sqlx::query("DELETE FROM recurring_tasks WHERE workspace_id = ?1")
            .bind(id)
            .execute(&mut *tx)
            .await?;
            
        for rt in recurring_tasks {
            let days_of_week_json = serde_json::to_string(&rt.days_of_week)?;
            sqlx::query(
                "INSERT INTO recurring_tasks (workspace_id, title, planning_memo, duration, days_of_week, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            )
            .bind(id)
            .bind(rt.title)
            .bind(rt.planning_memo)
            .bind(rt.duration)
            .bind(days_of_week_json)
            .bind(&created_at)
            .execute(&mut *tx)
            .await?;
        }
    }

    tx.commit().await?;
    Ok(())
}

pub async fn delete_workspace(pool: &SqlitePool, id: i64) -> Result<()> {
    sqlx::query("DELETE FROM workspaces WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn get_recurring_tasks(pool: &SqlitePool, workspace_id: i64) -> Result<Vec<RecurringTask>> {
    let list = sqlx::query_as::<_, RecurringTask>("SELECT * FROM recurring_tasks WHERE workspace_id = ?1 ORDER BY created_at DESC")
        .bind(workspace_id)
        .fetch_all(pool)
        .await?;
    Ok(list)
}

pub async fn add_recurring_task(pool: &SqlitePool, input: CreateRecurringTaskInput) -> Result<i64> {
    let days_of_week_json = serde_json::to_string(&input.days_of_week)?;
    let created_at = chrono::Local::now().to_rfc3339();

    let result = sqlx::query(
        "INSERT INTO recurring_tasks (workspace_id, title, planning_memo, duration, days_of_week, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(input.workspace_id)
    .bind(input.title)
    .bind(input.planning_memo)
    .bind(input.duration)
    .bind(days_of_week_json)
    .bind(created_at)
    .execute(pool)
    .await?;

    Ok(result.last_insert_rowid())
}

pub async fn delete_recurring_task(pool: &SqlitePool, id: i64) -> Result<()> {
    sqlx::query("DELETE FROM recurring_tasks WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePool;

    #[tokio::test]
    async fn test_create_workspace_transaction() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::query("CREATE TABLE workspaces (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, core_time_start TEXT, core_time_end TEXT, role_intro TEXT)").execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE unplugged_times (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, label TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces (id))").execute(&pool).await.unwrap();

        let input = CreateWorkspaceInput {
            name: "Test Workspace".to_string(),
            core_time_start: Some("09:00".to_string()),
            core_time_end: Some("18:00".to_string()),
            role_intro: Some("Engineer".to_string()),
            unplugged_times: vec![],
            recurring_tasks: None,
        };

        let mut tx = pool.begin().await.unwrap();
        let result = sqlx::query("INSERT INTO workspaces (name, core_time_start, core_time_end, role_intro) VALUES (?1, ?2, ?3, ?4)").bind(&input.name).bind(&input.core_time_start).bind(&input.core_time_end).bind(&input.role_intro).execute(&mut *tx).await.unwrap();
        let workspace_id = result.last_insert_rowid();
        tx.commit().await.unwrap();

        let ws = sqlx::query_as::<_, Workspace>("SELECT * FROM workspaces WHERE id = ?1").bind(workspace_id).fetch_one(&pool).await.unwrap();
        assert_eq!(ws.name, "Test Workspace");
    }

    #[tokio::test]
    async fn test_delete_workspace_cascade() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::query("PRAGMA foreign_keys = ON").execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE workspaces (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, core_time_start TEXT, core_time_end TEXT, role_intro TEXT)").execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, planning_memo TEXT, estimated_minutes INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.unwrap();

        // 1. Create workspace
        let ws_id = sqlx::query("INSERT INTO workspaces (name) VALUES (?1)").bind("To Delete").execute(&pool).await.unwrap().last_insert_rowid();
        
        // 2. Create task
        sqlx::query("INSERT INTO tasks (workspace_id, title) VALUES (?1, ?2)").bind(ws_id).bind("Task in WS").execute(&pool).await.unwrap();
        
        // 3. Delete workspace
        delete_workspace(&pool, ws_id).await.unwrap();
        
        // 4. Verify cascade
        let ws_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM workspaces").fetch_one(&pool).await.unwrap();
        let task_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tasks").fetch_one(&pool).await.unwrap();
        
        assert_eq!(ws_count.0, 0);
        assert_eq!(task_count.0, 0);
    }

    #[tokio::test]
    async fn test_recurring_tasks_crud() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::query("CREATE TABLE workspaces (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, core_time_start TEXT, core_time_end TEXT, role_intro TEXT)").execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE recurring_tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, planning_memo TEXT, duration INTEGER NOT NULL DEFAULT 0, days_of_week TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.unwrap();

        // 1. Setup workspace
        let ws_id = sqlx::query("INSERT INTO workspaces (name) VALUES (?1)").bind("Test WS").execute(&pool).await.unwrap().last_insert_rowid();

        // 2. Add recurring task
        let input = CreateRecurringTaskInput {
            workspace_id: ws_id,
            title: "Routine A".to_string(),
            planning_memo: Some("Plan A".to_string()),
            duration: 60,
            days_of_week: vec![1, 3, 5],
        };
        let task_id = add_recurring_task(&pool, input).await.unwrap();

        // 3. Get recurring tasks
        let list = get_recurring_tasks(&pool, ws_id).await.unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].title, "Routine A");
        assert_eq!(list[0].days_of_week, "[1,3,5]");
        assert_eq!(list[0].duration, 60);

        // 4. Delete recurring task
        delete_recurring_task(&pool, task_id).await.unwrap();
        let list_after = get_recurring_tasks(&pool, ws_id).await.unwrap();
        assert_eq!(list_after.len(), 0);
    }
}
