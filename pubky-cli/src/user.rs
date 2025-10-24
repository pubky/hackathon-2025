use std::path::PathBuf;
use std::str::FromStr;

use anyhow::{Context, Result};
use clap::Subcommand;
use pubky::{PubkyResource, PublicKey};

use crate::util::{build_pubky, build_signer, load_keypair_from_recovery_file};

#[derive(Subcommand, Debug)]
pub enum Command {
    /// Signup a user on a homeserver using a recovery file.
    Signup {
        /// Homeserver Pkarr Domain (e.g. `pubky.<public-key>` or bare public key).
        homeserver: String,
        /// Path to the user's recovery file.
        recovery_file: PathBuf,
        /// Optional signup code required by the homeserver.
        #[arg(long)]
        signup_code: Option<String>,
        /// Use the public network (default) or local testnet configuration.
        #[arg(long)]
        testnet: bool,
    },
    /// Sign in to a homeserver using a recovery file.
    Signin {
        /// Path to the user's recovery file.
        recovery_file: PathBuf,
        /// Use the public network (default) or local testnet configuration.
        #[arg(long)]
        testnet: bool,
        /// Wait for homeserver record publication before returning.
        #[arg(long)]
        sync_publish: bool,
    },
    /// Display the session information for a user.
    Session {
        /// Path to the user's recovery file.
        recovery_file: PathBuf,
        /// Use the public network (default) or local testnet configuration.
        #[arg(long)]
        testnet: bool,
    },
    /// Sign out of the homeserver for a given Pubky.
    Signout {
        /// Path to the user's recovery file.
        recovery_file: PathBuf,
        /// Use the public network (default) or local testnet configuration.
        #[arg(long)]
        testnet: bool,
    },
    /// List storage entries at a Pubky URL.
    List {
        /// Pubky URL or HTTPS URL to list (e.g. pubky://<pubky>/dav/).
        url: String,
        /// Reverse ordering.
        #[arg(long)]
        reverse: bool,
        /// Limit number of results.
        #[arg(long)]
        limit: Option<u16>,
        /// Pagination cursor.
        #[arg(long)]
        cursor: Option<String>,
        /// Shallow listing (does not recurse into nested directories).
        #[arg(long)]
        shallow: bool,
        /// Use the public network (default) or local testnet configuration.
        #[arg(long)]
        testnet: bool,
    },
    /// Send a Pubky Auth token to a third-party app.
    AuthToken {
        /// Path to the user's recovery file.
        recovery_file: PathBuf,
        /// pubkyauth:// or HTTPS callback URL provided by the third-party app.
        pubkyauth_url: String,
        /// Use the public network (default) or local testnet configuration.
        #[arg(long)]
        testnet: bool,
    },
    /// Publish data to a Pubky URL from a file.
    Publish {
        /// Path to file "/pub/test.txt"
        data_path: String,
        /// Path to the file containing the data to publish.
        file: PathBuf,
        /// Path to the user's recovery file.
        recovery_file: PathBuf,
        /// Use the public network (default) or local testnet configuration.
        #[arg(long)]
        testnet: bool,
    },
    /// Delete data at a Pubky URL.
    Delete {
        /// Path to file "/pub/test.txt"
        data_path: String,
        /// Path to the user's recovery file.
        recovery_file: PathBuf,
        /// Use the public network (default) or local testnet configuration.
        #[arg(long)]
        testnet: bool,
    },
    /// Get data to a Pubky URL from a file.
    Get {
        /// Path to file "/pub/test.txt"
        data_path: String,
        /// Path to the user's recovery file.
        recovery_file: PathBuf,
        /// Use the public network (default) or local testnet configuration.
        #[arg(long)]
        testnet: bool,
    },
}

pub async fn run(command: Command) -> Result<()> {
    match command {
        Command::Signup {
            homeserver,
            recovery_file,
            signup_code,
            testnet,
        } => signup_user(homeserver, recovery_file, signup_code, testnet).await?,
        Command::Signin {
            recovery_file,
            testnet,
            sync_publish,
        } => signin_user(recovery_file, testnet, sync_publish).await?,
        Command::Session {
            recovery_file,
            testnet,
        } => fetch_session(recovery_file, testnet).await?,
        Command::Signout {
            recovery_file,
            testnet,
        } => signout_user(recovery_file, testnet).await?,
        Command::List {
            url,
            reverse,
            limit,
            cursor,
            shallow,
            testnet,
        } => list_resources(url, reverse, limit, cursor, shallow, testnet).await?,
        Command::AuthToken {
            recovery_file,
            pubkyauth_url,
            testnet,
        } => send_auth_token(recovery_file, pubkyauth_url, testnet).await?,
        Command::Publish {
            data_path,
            file,
            recovery_file,
            testnet,
        } => publish_data(data_path, file, recovery_file, testnet).await?,
        Command::Delete {
            data_path,
            recovery_file,
            testnet,
        } => delete_data(data_path, recovery_file, testnet).await?,
        Command::Get {
            data_path,
            recovery_file,
            testnet,
        } => get_data(data_path, recovery_file, testnet).await?,
    }

    Ok(())
}

async fn signup_user(
    homeserver: String,
    recovery_file: PathBuf,
    signup_code: Option<String>,
    testnet: bool,
) -> Result<()> {
    let keypair = load_keypair_from_recovery_file(&recovery_file)?;
    println!("Loaded recovery file for Pubky {}", keypair.public_key());

    let homeserver_key = PublicKey::from_str(homeserver.as_str())?;

    let signer = build_signer(testnet, keypair)?;

    let session = signer
        .signup(&homeserver_key, signup_code.as_deref())
        .await?;

    println!("Signup successful. Session details:");
    println!("{:#?}", session.info());

    Ok(())
}

async fn signin_user(recovery_file: PathBuf, testnet: bool, sync_publish: bool) -> Result<()> {
    let keypair = load_keypair_from_recovery_file(&recovery_file)?;
    println!("Loaded recovery file for Pubky {}", keypair.public_key());

    let signer = build_signer(testnet, keypair)?;

    let session = if sync_publish {
        signer.signin_blocking().await?
    } else {
        signer.signin().await?
    };

    println!("Signin successful. Session details:");
    println!("{:#?}", session.info());

    Ok(())
}

async fn signout_user(recovery_file: PathBuf, testnet: bool) -> Result<()> {
    let keypair = load_keypair_from_recovery_file(&recovery_file)?;
    println!("Loaded recovery file for Pubky {}", keypair.public_key());

    let signer = build_signer(testnet, keypair)?;
    let session = signer.signin().await?;
    let user_pubkey = session.info().public_key().clone();

    session.signout().await.map_err(|(err, _)| err)?;

    println!("Signed out of homeserver for {}", user_pubkey);

    Ok(())
}

async fn fetch_session(recovery_file: PathBuf, testnet: bool) -> Result<()> {
    let keypair = load_keypair_from_recovery_file(&recovery_file)?;
    println!("Loaded recovery file for Pubky {}", keypair.public_key());

    let signer = build_signer(testnet, keypair)?;
    let session = signer.signin().await?;

    println!("Session information:");
    println!("{:#?}", session.info());

    session.signout().await.map_err(|(err, _)| err)?;
    println!("Session closed.");

    Ok(())
}

async fn list_resources(
    url: String,
    reverse: bool,
    limit: Option<u16>,
    cursor: Option<String>,
    shallow: bool,
    testnet: bool,
) -> Result<()> {
    let facade = build_pubky(testnet)?;
    let storage = facade.public_storage();
    let resource: PubkyResource = url
        .parse()
        .with_context(|| "List URL must be pubky://<user>/<path> or pubky<user>/<path>")?;
    let mut builder = storage.list(resource)?;

    if reverse {
        builder = builder.reverse(true);
    }

    if shallow {
        builder = builder.shallow(true);
    }

    if let Some(limit) = limit {
        builder = builder.limit(limit);
    }

    if let Some(cursor) = cursor.as_deref() {
        builder = builder.cursor(cursor);
    }

    let entries = builder.send().await?;

    if entries.is_empty() {
        println!("No entries returned.");
    } else {
        for entry in entries {
            println!("{}", entry.to_pubky_url());
        }
    }

    Ok(())
}

async fn send_auth_token(
    recovery_file: PathBuf,
    pubkyauth_url: String,
    testnet: bool,
) -> Result<()> {
    let keypair = load_keypair_from_recovery_file(&recovery_file)?;
    println!("Loaded recovery file for Pubky {}", keypair.public_key());

    let signer = build_signer(testnet, keypair)?;

    signer
        .approve_auth(&pubkyauth_url)
        .await
        .with_context(|| "Failed to send Pubky auth token")?;

    println!("Auth token sent successfully.");

    Ok(())
}

async fn publish_data(
    data_path: String,
    file: PathBuf,
    recovery_file: PathBuf,
    testnet: bool,
) -> Result<()> {
    // Load the recovery file and sign in to get a session
    let keypair = load_keypair_from_recovery_file(&recovery_file)
        .with_context(|| format!("Failed to load recovery file: {}", recovery_file.display()))?;
    println!("Loaded recovery file for Pubky {}", keypair.public_key());

    let signer = build_signer(testnet, keypair)?;
    let session = signer.signin().await?;
    println!("Signed in successfully. Session details:");
    println!("{:#?}", session.info());

    // Read the file data
    let data = tokio::fs::read(&file)
        .await
        .with_context(|| format!("Failed to read file: {}", file.display()))?;

    // Get the storage object from the session
    let storage = session.storage();

    // Use the `put` method to upload the data
    storage
        .put(data_path.to_string(), reqwest::Body::from(data))
        .await
        .with_context(|| "Failed to publish data")?;

    println!("Data published successfully to {}", data_path);

    // Sign out after publishing
    session.signout().await.map_err(|(err, _)| err)?;
    println!("Signed out successfully.");

    Ok(())
}

async fn delete_data(data_path: String, recovery_file: PathBuf, testnet: bool) -> Result<()> {
    // Load the recovery file and sign in to get a session
    let keypair = load_keypair_from_recovery_file(&recovery_file)
        .with_context(|| format!("Failed to load recovery file: {}", recovery_file.display()))?;
    println!("Loaded recovery file for Pubky {}", keypair.public_key());

    let signer = build_signer(testnet, keypair)?;
    let session = signer.signin().await?;
    println!("Signed in successfully. Session details:");
    println!("{:#?}", session.info());

    // Get the storage object from the session
    let storage = session.storage();

    // Use the `delete` method to remove the data
    storage
        .delete(data_path.to_string())
        .await
        .with_context(|| "Failed to delete data")?;

    println!("Data deleted successfully at {}", data_path);

    // Sign out after deleting
    session.signout().await.map_err(|(err, _)| err)?;
    println!("Signed out successfully.");

    Ok(())
}

async fn get_data(data_path: String, recovery_file: PathBuf, testnet: bool) -> Result<()> {
    // Load the recovery file and sign in to get a session
    let keypair = load_keypair_from_recovery_file(&recovery_file)
        .with_context(|| format!("Failed to load recovery file: {}", recovery_file.display()))?;
    println!("Loaded recovery file for Pubky {}", keypair.public_key());

    let signer = build_signer(testnet, keypair)?;
    let session = signer.signin().await?;
    println!("Signed in successfully. Session details:");
    println!("{:#?}", session.info());

    // Get the storage object from the session
    let storage = session.storage();

    // Use the `get` method to get the data
    let data_text = storage
        .get(data_path.to_string())
        .await
        .with_context(|| "Failed to get data")?
        .text()
        .await
        .with_context(|| "Transform data to text")?;

    println!("Data at {}: {}", data_path, data_text);

    // Sign out after getting data
    session.signout().await.map_err(|(err, _)| err)?;
    println!("Signed out successfully.");

    Ok(())
}
