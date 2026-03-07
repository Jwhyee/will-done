use sqlx::SqlitePool;
use crate::models::{Workspace, UnpluggedTime, CreateWorkspaceInput, Project, Label, ProjectInput, LabelInput};
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
    input: CreateWorkspaceInput,
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

pub async fn get_projects(pool: &SqlitePool) -> Result<Vec<Project>> {
    let projects = sqlx::query_as::<_, Project>("SELECT * FROM projects ORDER BY last_used DESC")
        .fetch_all(pool)
        .await?;
    Ok(projects)
}

pub async fn create_project(pool: &SqlitePool, input: ProjectInput) -> Result<i64> {
    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    let result = sqlx::query("INSERT INTO projects (name, last_used) VALUES (?1, ?2)")
        .bind(&input.name)
        .bind(&now)
        .execute(pool)
        .await?;
    Ok(result.last_insert_rowid())
}

pub async fn update_project(pool: &SqlitePool, id: i64, input: ProjectInput) -> Result<()> {
    sqlx::query("UPDATE projects SET name = ?1 WHERE id = ?2")
        .bind(&input.name)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete_project(pool: &SqlitePool, id: i64) -> Result<()> {
    sqlx::query("DELETE FROM projects WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn get_labels(pool: &SqlitePool) -> Result<Vec<Label>> {
    let labels = sqlx::query_as::<_, Label>("SELECT * FROM labels ORDER BY last_used DESC")
        .fetch_all(pool)
        .await?;
    Ok(labels)
}

pub async fn create_label(pool: &SqlitePool, input: LabelInput) -> Result<i64> {
    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    let result = sqlx::query("INSERT INTO labels (name, color, last_used) VALUES (?1, ?2, ?3)")
        .bind(&input.name)
        .bind(&input.color)
        .bind(&now)
        .execute(pool)
        .await?;
    Ok(result.last_insert_rowid())
}

pub async fn update_label(pool: &SqlitePool, id: i64, input: LabelInput) -> Result<()> {
    sqlx::query("UPDATE labels SET name = ?1, color = ?2 WHERE id = ?3")
        .bind(&input.name)
        .bind(&input.color)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete_label(pool: &SqlitePool, id: i64) -> Result<()> {
    sqlx::query("DELETE FROM labels WHERE id = ?1")
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn search_task_titles(
    pool: &sqlx::SqlitePool,
    workspace_id: i64,
    query: &str,
    limit: i64,
) -> Result<Vec<String>> {
    let wildcard_query = format!("%{}%", query);
    let titles: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT title FROM tasks WHERE workspace_id = ?1 AND title LIKE ?2 LIMIT ?3",
    )
    .bind(workspace_id)
    .bind(&wildcard_query)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(titles)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePool;

    #[tokio::test]
    async fn test_search_task_titles() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::query("CREATE TABLE workspaces (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, core_time_start TEXT, core_time_end TEXT, role_intro TEXT)").execute(&pool).await.unwrap();
        sqlx::query("CREATE TABLE tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id INTEGER NOT NULL, title TEXT NOT NULL, planning_memo TEXT, estimated_minutes INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE)").execute(&pool).await.unwrap();

        let ws_id = sqlx::query("INSERT INTO workspaces (name) VALUES ('Test WS')").execute(&pool).await.unwrap().last_insert_rowid();

        sqlx::query("INSERT INTO tasks (workspace_id, title) VALUES (?1, 'Apple Pie')").bind(ws_id).execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (workspace_id, title) VALUES (?1, 'Apple Juice')").bind(ws_id).execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (workspace_id, title) VALUES (?1, 'Banana')").bind(ws_id).execute(&pool).await.unwrap();
        sqlx::query("INSERT INTO tasks (workspace_id, title) VALUES (?1, 'Apple Pie')").bind(ws_id).execute(&pool).await.unwrap();

        let titles = search_task_titles(&pool, ws_id, "App", 10).await.unwrap();
        assert_eq!(titles.len(), 2);
        assert!(titles.contains(&"Apple Pie".to_string()));
        assert!(titles.contains(&"Apple Juice".to_string()));

        let bananas = search_task_titles(&pool, ws_id, "Ban", 10).await.unwrap();
        assert_eq!(bananas.len(), 1);
        assert_eq!(bananas[0], "Banana");
    }

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
    async fn test_project_crud() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::query("CREATE TABLE projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, last_used TEXT NOT NULL)").execute(&pool).await.unwrap();

        // 1. Create Project
        let project_id = create_project(&pool, ProjectInput { name: "Test Project".to_string() }).await.unwrap();
        assert!(project_id > 0);

        // 2. Get Projects
        let projects = get_projects(&pool).await.unwrap();
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].name, "Test Project");

        // 3. Update Project
        update_project(&pool, project_id, ProjectInput { name: "Updated Project".to_string() }).await.unwrap();
        let projects_updated = get_projects(&pool).await.unwrap();
        assert_eq!(projects_updated[0].name, "Updated Project");

        // 4. Delete Project
        delete_project(&pool, project_id).await.unwrap();
        let projects_after_delete = get_projects(&pool).await.unwrap();
        assert!(projects_after_delete.is_empty());
    }

    #[tokio::test]
    async fn test_label_crud() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
        sqlx::query("CREATE TABLE labels (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT NOT NULL, last_used TEXT NOT NULL)").execute(&pool).await.unwrap();

        // 1. Create Label
        let label_id = create_label(&pool, LabelInput { name: "Bug".to_string(), color: "#FF0000".to_string() }).await.unwrap();
        assert!(label_id > 0);

        // 2. Get Labels
        let labels = get_labels(&pool).await.unwrap();
        assert_eq!(labels.len(), 1);
        assert_eq!(labels[0].name, "Bug");
        assert_eq!(labels[0].color, "#FF0000");

        // 3. Update Label
        update_label(&pool, label_id, LabelInput { name: "Feature".to_string(), color: "#00FF00".to_string() }).await.unwrap();
        let labels_updated = get_labels(&pool).await.unwrap();
        assert_eq!(labels_updated[0].name, "Feature");
        assert_eq!(labels_updated[0].color, "#00FF00");

        // 4. Delete Label
        delete_label(&pool, label_id).await.unwrap();
        let labels_after_delete = get_labels(&pool).await.unwrap();
        assert!(labels_after_delete.is_empty());
    }
}
