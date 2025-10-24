use std::str::FromStr;

use anyhow::{Context, Result, bail};
use clap::{Args, Subcommand};
use pubky::PublicKey;
use reqwest::{Client as HttpClient, Method, Url};
use serde::Deserialize;
use serde::de::DeserializeOwned;

#[derive(Args, Debug, Clone)]
pub struct ConnectionArgs {
    /// Base URL of the admin server (e.g. http://127.0.0.1:6288)
    #[arg(long, default_value = "http://127.0.0.1:6288")]
    pub admin_url: String,
    /// Admin password; falls back to $PUBKY_ADMIN_PASSWORD or an interactive prompt.
    #[arg(long, env = "PUBKY_ADMIN_PASSWORD")]
    pub password: Option<String>,
}

#[derive(Subcommand, Debug)]
pub enum Command {
    /// Fetch summary information from the admin API.
    Info {
        #[command(flatten)]
        connection: ConnectionArgs,
    },
    /// Generate a new signup token via the admin API.
    GenerateToken {
        #[command(flatten)]
        connection: ConnectionArgs,
    },
    /// Manage users (enable/disable).
    User {
        #[command(flatten)]
        connection: ConnectionArgs,
        #[command(subcommand)]
        action: UserCommand,
    },
    /// Manage stored resources (WebDAV entries).
    Storage {
        #[command(flatten)]
        connection: ConnectionArgs,
        #[command(subcommand)]
        action: StorageCommand,
    },
}

#[derive(Subcommand, Debug)]
pub enum UserCommand {
    /// Disable a user by public key.
    Disable { pubky: String },
    /// Enable a user by public key.
    Enable { pubky: String },
}

#[derive(Subcommand, Debug)]
pub enum StorageCommand {
    /// Delete a WebDAV entry; path must start with /pub/
    Delete { pubky: String, path: String },
}

pub async fn run(command: Command) -> Result<()> {
    match command {
        Command::Info { connection } => {
            info(connection).await?;
        }
        Command::GenerateToken { connection } => {
            generate_signup_token(connection).await?;
        }
        Command::User { connection, action } => {
            let client = connection.into_client()?;
            match action {
                UserCommand::Disable { pubky } => disable_user(&client, &pubky).await?,
                UserCommand::Enable { pubky } => enable_user(&client, &pubky).await?,
            }
        }
        Command::Storage { connection, action } => {
            let client = connection.into_client()?;
            match action {
                StorageCommand::Delete { pubky, path } => {
                    delete_entry(&client, &pubky, &path).await?
                }
            }
        }
    }

    Ok(())
}

impl ConnectionArgs {
    fn into_client(self) -> Result<AdminHttpClient> {
        let password = match self.password {
            Some(password) => password,
            None => rpassword::prompt_password("Admin password (input hidden): ")?,
        };

        AdminHttpClient::new(&self.admin_url, password)
    }
}

struct AdminHttpClient {
    client: HttpClient,
    base_url: Url,
    password: String,
}

#[derive(Debug, Deserialize)]
struct AdminInfoResponse {
    num_users: u64,
    num_disabled_users: u64,
    total_disk_used_mb: f64,
    num_signup_codes: u64,
    num_unused_signup_codes: u64,
}

impl AdminHttpClient {
    fn new(admin_url: &str, password: String) -> Result<Self> {
        let base_url = Url::parse(admin_url)
            .or_else(|_| Url::parse(&format!("http://{}", admin_url)))
            .context("Failed to parse admin URL")?;

        Ok(Self {
            client: HttpClient::new(),
            base_url,
            password,
        })
    }

    fn endpoint(&self, path: &str) -> Result<Url> {
        let trimmed = path.trim_start_matches('/');
        Ok(self.base_url.join(trimmed)?)
    }

    async fn request(&self, method: Method, path: &str) -> Result<reqwest::Response> {
        let url = self.endpoint(path)?;
        let response = self
            .client
            .request(method, url)
            .header("X-Admin-Password", &self.password)
            .send()
            .await?;

        Ok(response.error_for_status()?)
    }

    async fn get_json<T>(&self, path: &str) -> Result<T>
    where
        T: DeserializeOwned,
    {
        Ok(self.request(Method::GET, path).await?.json().await?)
    }

    async fn get_text(&self, path: &str) -> Result<String> {
        Ok(self.request(Method::GET, path).await?.text().await?)
    }

    async fn post_empty(&self, path: &str) -> Result<()> {
        self.request(Method::POST, path).await?;
        Ok(())
    }

    async fn delete(&self, path: &str) -> Result<()> {
        self.request(Method::DELETE, path).await?;
        Ok(())
    }
}

async fn info(connection: ConnectionArgs) -> Result<()> {
    let client = connection.into_client()?;
    let info: AdminInfoResponse = client.get_json("info").await?;

    println!("Users: {}", info.num_users);
    println!("Disabled users: {}", info.num_disabled_users);
    println!("Disk usage (MB): {:.2}", info.total_disk_used_mb);
    println!("Signup codes: {}", info.num_signup_codes);
    println!("Unused signup codes: {}", info.num_unused_signup_codes);

    Ok(())
}

async fn generate_signup_token(connection: ConnectionArgs) -> Result<()> {
    let client = connection.into_client()?;
    let token = client.get_text("generate_signup_token").await?;

    println!("{}", token);

    Ok(())
}

async fn disable_user(client: &AdminHttpClient, pubky: &str) -> Result<()> {
    let public_key = PublicKey::from_str(pubky)?;
    client
        .post_empty(&format!("users/{}/disable", public_key))
        .await?;

    println!("Disabled user {}", public_key);

    Ok(())
}

async fn enable_user(client: &AdminHttpClient, pubky: &str) -> Result<()> {
    let public_key = PublicKey::from_str(pubky)?;
    client
        .post_empty(&format!("users/{}/enable", public_key))
        .await?;

    println!("Enabled user {}", public_key);

    Ok(())
}

async fn delete_entry(client: &AdminHttpClient, pubky: &str, path: &str) -> Result<()> {
    let public_key = PublicKey::from_str(pubky)?;

    let normalized_path = if path.starts_with('/') {
        path.to_string()
    } else {
        format!("/{}", path)
    };

    if !normalized_path.starts_with("/pub/") {
        bail!("entry path must start with /pub/");
    }

    let endpoint = format!("webdav/{}{}", public_key, normalized_path);
    client.delete(&endpoint).await?;

    println!("Deleted entry {}{}", public_key, normalized_path);

    Ok(())
}
