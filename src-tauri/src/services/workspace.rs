use sqlx::SqlitePool;
use crate::domain::{Workspace, UnpluggedTime, CreateWorkspaceInput, Project, Label, ProjectInput, LabelInput};
use crate::database;
use crate::domain::Result;

pub async fn create_workspace(
    pool: &SqlitePool,
    input: CreateWorkspaceInput,
) -> Result<i64> {
    database::workspace::create_workspace(pool, input).await
}

pub async fn get_workspaces(pool: &SqlitePool) -> Result<Vec<Workspace>> {
    database::workspace::get_workspaces(pool).await
}

pub async fn get_workspace(pool: &SqlitePool, id: i64) -> Result<Option<Workspace>> {
    database::workspace::get_workspace(pool, id).await
}

pub async fn get_unplugged_times(pool: &SqlitePool, workspace_id: i64) -> Result<Vec<UnpluggedTime>> {
    database::workspace::get_unplugged_times(pool, workspace_id).await
}

pub async fn update_workspace(
    pool: &SqlitePool,
    id: i64,
    input: CreateWorkspaceInput,
) -> Result<()> {
    database::workspace::update_workspace(pool, id, input).await
}

pub async fn delete_workspace(pool: &SqlitePool, id: i64) -> Result<()> {
    database::workspace::delete_workspace(pool, id).await
}

pub async fn suggest_task_titles(
    pool: &SqlitePool,
    workspace_id: i64,
    query: &str,
    limit: i64,
) -> Result<Vec<String>> {
    database::workspace::search_task_titles(pool, workspace_id, query, limit).await
}

pub async fn get_projects(pool: &SqlitePool) -> Result<Vec<Project>> {
    database::workspace::get_projects(pool).await
}

pub async fn create_project(pool: &SqlitePool, input: ProjectInput) -> Result<i64> {
    database::workspace::create_project(pool, input).await
}

pub async fn update_project(pool: &SqlitePool, id: i64, input: ProjectInput) -> Result<()> {
    database::workspace::update_project(pool, id, input).await
}

pub async fn delete_project(pool: &SqlitePool, id: i64) -> Result<()> {
    database::workspace::delete_project(pool, id).await
}

pub async fn get_labels(pool: &SqlitePool) -> Result<Vec<Label>> {
    database::workspace::get_labels(pool).await
}

pub async fn create_label(pool: &SqlitePool, input: LabelInput) -> Result<i64> {
    database::workspace::create_label(pool, input).await
}

pub async fn update_label(pool: &SqlitePool, id: i64, input: LabelInput) -> Result<()> {
    database::workspace::update_label(pool, id, input).await
}

pub async fn delete_label(pool: &SqlitePool, id: i64) -> Result<()> {
    database::workspace::delete_label(pool, id).await
}
