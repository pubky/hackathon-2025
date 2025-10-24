use std::{env, path::Path, time::Duration};

use anyhow::{Context, Result};
use pubky::recovery_file::create_recovery_file;
use pubky::{Keypair, Pubky, PubkyHttpClient, PubkySigner};

const PKARR_BOOTSTRAP_ENV: &str = "PUBKY_PKARR_BOOTSTRAP";
const PKARR_RELAYS_ENV: &str = "PUBKY_PKARR_RELAYS";
const PKARR_TIMEOUT_ENV: &str = "PUBKY_PKARR_TIMEOUT_MS";

pub fn build_pubky(testnet: bool) -> Result<Pubky> {
    if let Some(facade) = build_pubky_from_env()? {
        return Ok(facade);
    }

    let facade = if testnet {
        Pubky::testnet()?
    } else {
        Pubky::new()?
    };

    Ok(facade)
}

pub fn build_signer(testnet: bool, keypair: Keypair) -> Result<PubkySigner> {
    let facade = build_pubky(testnet)?;
    Ok(facade.signer(keypair))
}

fn build_pubky_from_env() -> Result<Option<Pubky>> {
    let bootstrap_raw = env::var(PKARR_BOOTSTRAP_ENV).ok().filter(|s| !s.is_empty());
    let relays_raw = env::var(PKARR_RELAYS_ENV).ok().filter(|s| !s.is_empty());

    if bootstrap_raw.is_none() && relays_raw.is_none() {
        return Ok(None);
    }

    let bootstrap_list = bootstrap_raw
        .as_ref()
        .map(|raw| parse_csv(raw))
        .unwrap_or_default();
    let relays_list = relays_raw
        .as_ref()
        .map(|raw| parse_csv(raw))
        .unwrap_or_default();

    let mut builder = PubkyHttpClient::builder();
    builder.pkarr(|pb| {
        pb.no_default_network();
        if !bootstrap_list.is_empty() {
            let refs: Vec<&str> = bootstrap_list.iter().map(|s| s.as_str()).collect();
            pb.bootstrap(&refs);
        }
        if !relays_list.is_empty() {
            let refs: Vec<&str> = relays_list.iter().map(|s| s.as_str()).collect();
            pb.relays(&refs)
                .expect("invalid relay url in PUBKY_PKARR_RELAYS");
        } else {
            pb.no_relays();
        }
        pb
    });

    if let Some(timeout_ms) = env::var(PKARR_TIMEOUT_ENV)
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
    {
        builder.request_timeout(Duration::from_millis(timeout_ms));
    }

    let client = builder.build()?;
    Ok(Some(Pubky::with_client(client)))
}

fn parse_csv(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}

pub fn load_keypair_from_recovery_file(path: &Path) -> Result<Keypair> {
    let recovery_bytes = std::fs::read(path)
        .with_context(|| format!("Failed to read recovery file {}", path.display()))?;

    let passphrase = match std::env::var("PUBKY_CLI_RECOVERY_PASSPHRASE") {
        Ok(value) => value,
        Err(_) => {
            let prompt = format!(
                "Enter the recovery file passphrase for {} (input hidden): ",
                path.display()
            );
            rpassword::prompt_password(prompt)?
        }
    };

    let keypair = pubky::recovery_file::decrypt_recovery_file(&recovery_bytes, &passphrase)
        .with_context(|| "Failed to decrypt recovery file with provided passphrase")?;

    Ok(keypair)
}

pub fn create_recovery_file_on_disk(path: &Path, passphrase: &str) -> Result<Keypair> {
    let keypair = Keypair::random();
    let bytes = create_recovery_file(&keypair, passphrase);
    std::fs::write(path, bytes)
        .with_context(|| format!("Failed to write recovery file to {}", path.display()))?;
    Ok(keypair)
}
