use std::fs::File;
use std::io::{self, Write};
use std::path::PathBuf;

use anyhow::{Context, Result};
use clap::{CommandFactory, Subcommand};
use clap_complete::{Shell, generate};

use crate::{Cli, util::create_recovery_file_on_disk};

#[derive(Subcommand, Debug)]
pub enum Command {
    /// Generate a recovery file with a random keypair for demos/tests.
    GenerateRecovery {
        /// Path where the recovery file should be written.
        output: PathBuf,
        /// Optional passphrase for the recovery file. Prompts if omitted.
        #[arg(long)]
        passphrase: Option<String>,
    },
    /// Emit shell completion scripts for the CLI.
    Completions {
        /// Target shell (bash, zsh, fish, powershell, elvish).
        shell: Shell,
        /// Optional output path. If omitted, the script is written to stdout.
        #[arg(long)]
        outfile: Option<PathBuf>,
    },
}

pub async fn run(command: Command) -> Result<()> {
    match command {
        Command::GenerateRecovery { output, passphrase } => {
            generate_recovery(output, passphrase)?;
        }
        Command::Completions { shell, outfile } => {
            emit_completions(shell, outfile)?;
        }
    }

    Ok(())
}

fn generate_recovery(output: PathBuf, passphrase: Option<String>) -> Result<()> {
    let passphrase = match passphrase {
        Some(pass) => pass,
        None => {
            let prompt = format!(
                "Enter a passphrase to protect {} (input hidden): ",
                output.display()
            );
            rpassword::prompt_password(prompt)?
        }
    };

    let keypair = create_recovery_file_on_disk(&output, &passphrase)?;

    println!("Recovery file written to {}", output.display());
    println!("Keep this passphrase safe: {}", passphrase);
    println!("User Pubky public key: {}", keypair.public_key());

    Ok(())
}

fn emit_completions(shell: Shell, outfile: Option<PathBuf>) -> Result<()> {
    let mut cmd = Cli::command();
    let bin_name = cmd.get_name().to_string();

    match outfile {
        Some(path) => {
            let mut file = File::create(&path)
                .with_context(|| format!("failed to create {}", path.display()))?;
            generate(shell, &mut cmd, bin_name, &mut file);
            println!(
                "Completion script for {} written to {}",
                shell,
                path.display()
            );
        }
        None => {
            let mut buffer = Vec::new();
            generate(shell, &mut cmd, bin_name, &mut buffer);
            io::stdout().write_all(&buffer)?;
        }
    }

    Ok(())
}
