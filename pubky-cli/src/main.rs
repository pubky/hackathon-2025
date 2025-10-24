mod admin;
mod tools;
mod user;
mod util;

use anyhow::Result;
use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Operator-oriented commands that hit the homeserver admin API.
    Admin {
        #[command(subcommand)]
        action: admin::Command,
    },
    /// User-oriented commands that talk to the homeserver client API.
    User {
        #[command(subcommand)]
        action: user::Command,
    },
    /// Helper utilities.
    Tools {
        #[command(subcommand)]
        action: tools::Command,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Admin { action } => admin::run(action).await?,
        Commands::User { action } => user::run(action).await?,
        Commands::Tools { action } => tools::run(action).await?,
    }

    Ok(())
}
