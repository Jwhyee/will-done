pub mod user;
pub mod workspace;
pub mod timeline;
pub mod retrospective;
pub mod gemini;
pub mod error;

pub use user::*;
pub use workspace::*;
pub use timeline::*;
pub use retrospective::*;
pub use gemini::*;
pub use error::*;

pub struct DbState {
    pub pool: sqlx::Pool<sqlx::Sqlite>,
}
