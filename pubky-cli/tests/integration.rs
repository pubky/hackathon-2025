use std::process::Output;
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use assert_cmd::Command;
use predicates::Predicate;
use predicates::prelude::PredicateBooleanExt;
use pubky::Keypair;
use pubky::recovery_file;
use pubky_testnet::EphemeralTestnet;
use serde::Deserialize;
use serial_test::serial;
use tempfile::{NamedTempFile, tempdir};
use tokio::time::sleep;

#[derive(Debug, Deserialize)]
struct AdminInfo {
    num_users: u64,
    num_disabled_users: u64,
    num_signup_codes: u64,
    num_unused_signup_codes: u64,
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[serial]
async fn admin_info_command_returns_stats() -> Result<()> {
    let network = start_testnet().await?;
    sleep(Duration::from_millis(500)).await;

    let admin_url = admin_base_url(&network);
    let output = run_cli_static(&["admin", "info", "--admin-url", &admin_url], admin_env()).await?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let predicate = predicates::str::contains("Users: 0")
        .and(predicates::str::contains("Disabled users: 0"))
        .and(predicates::str::contains("Signup codes: 0"));
    assert!(
        predicate.eval(&stdout),
        "unexpected admin info output:\n{}",
        stdout
    );

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[serial]
async fn admin_user_disable_and_enable_flow() -> Result<()> {
    let network = start_testnet().await?;
    sleep(Duration::from_millis(500)).await;

    let admin_url = admin_base_url(&network);
    let homeserver_pk = network.homeserver().public_key();

    let sdk = network.sdk().context("build sdk facade")?;
    let keypair = Keypair::random();
    let signer = sdk.signer(keypair.clone());
    let session = signer
        .signup(&homeserver_pk, None)
        .await
        .context("signup test user")?;
    session.signout().await.map_err(|(err, _)| err)?;

    let user_pubkey = keypair.public_key().to_string();

    run_cli_static(
        &[
            "admin",
            "user",
            "--admin-url",
            &admin_url,
            "disable",
            &user_pubkey,
        ],
        admin_env(),
    )
    .await?;

    let info_after_disable = fetch_info(&admin_url, "admin").await?;
    assert_eq!(info_after_disable.num_users, 1);
    assert_eq!(info_after_disable.num_disabled_users, 1);

    run_cli_static(
        &[
            "admin",
            "user",
            "--admin-url",
            &admin_url,
            "enable",
            &user_pubkey,
        ],
        admin_env(),
    )
    .await?;

    let info_after_enable = fetch_info(&admin_url, "admin").await?;
    assert_eq!(info_after_enable.num_users, 1);
    assert_eq!(info_after_enable.num_disabled_users, 0);

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[serial]
async fn admin_generate_token_produces_invite() -> Result<()> {
    let network = start_testnet().await?;
    sleep(Duration::from_millis(500)).await;

    let admin_url = admin_base_url(&network);
    let before = fetch_info(&admin_url, "admin").await?;

    let output = run_cli_static(
        &["admin", "generate-token", "--admin-url", &admin_url],
        admin_env(),
    )
    .await?;

    let token = String::from_utf8_lossy(&output.stdout).trim().to_string();
    assert!(
        !token.is_empty(),
        "expected invitation token from CLI, got '{}'",
        token
    );

    let after = fetch_info(&admin_url, "admin").await?;
    assert_eq!(after.num_signup_codes, before.num_signup_codes + 1);
    assert_eq!(
        after.num_unused_signup_codes,
        before.num_unused_signup_codes + 1
    );

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[serial]
async fn admin_storage_delete_removes_entry() -> Result<()> {
    let network = start_testnet().await?;
    sleep(Duration::from_millis(500)).await;

    let admin_url = admin_base_url(&network);
    let homeserver_pk = network.homeserver().public_key();

    let sdk = network.sdk().context("build sdk facade")?;
    let keypair = Keypair::random();
    let signer = sdk.signer(keypair.clone());

    let session = signer
        .signup(&homeserver_pk, None)
        .await
        .context("signup test user")?;
    session
        .storage()
        .put("/pub/app/hello.txt", "hello world")
        .await
        .context("upload file")?;
    session.signout().await.map_err(|(err, _)| err)?;

    let session = signer.signin().await?;
    assert!(
        session
            .storage()
            .exists("/pub/app/hello.txt")
            .await
            .context("confirm file exists before deletion")?,
        "expected file before admin delete"
    );
    session.signout().await.map_err(|(err, _)| err)?;

    run_cli_static(
        &[
            "admin",
            "storage",
            "--admin-url",
            &admin_url,
            "delete",
            &keypair.public_key().to_string(),
            "/pub/app/hello.txt",
        ],
        admin_env(),
    )
    .await?;

    let session = signer.signin().await?;
    assert!(
        !session
            .storage()
            .exists("/pub/app/hello.txt")
            .await
            .context("confirm file gone after deletion")?,
        "expected file to be removed after admin delete"
    );
    session.signout().await.map_err(|(err, _)| err)?;

    Ok(())
}

#[tokio::test]
async fn tools_generate_recovery_creates_file() -> Result<()> {
    let tmp = NamedTempFile::new().context("create temp recovery file")?;
    let path = tmp.into_temp_path();
    let path_buf = path.to_path_buf();

    let output = run_cli_static(
        &[
            "tools",
            "generate-recovery",
            path_buf.to_str().unwrap(),
            "--passphrase",
            "demo-pass",
        ],
        &[],
    )
    .await?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("Recovery file written"));
    assert!(stdout.contains("demo-pass"));
    assert!(stdout.contains("User Pubky public key"));
    assert!(path_buf.exists());

    Ok(())
}

#[tokio::test]
async fn tools_completions_generate_script() -> Result<()> {
    let tmp = NamedTempFile::new().context("create temp completion file")?;
    let path = tmp.into_temp_path();
    let path_buf = path.to_path_buf();

    run_cli_static(
        &[
            "tools",
            "completions",
            "bash",
            "--outfile",
            path_buf.to_str().unwrap(),
        ],
        &[],
    )
    .await?;

    let contents = std::fs::read_to_string(&path_buf).context("read generated completion")?;
    assert!(
        contents.contains("_pubky-cli"),
        "unexpected completion output"
    );

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[serial]
async fn user_signup_signin_session_signout_flow() -> Result<()> {
    let network = start_testnet().await?;
    let passphrase = "demo-pass";
    let env = user_env(passphrase, &network);
    sleep(Duration::from_millis(500)).await;

    let temp_dir = tempdir().context("create temp dir")?;
    let recovery_path = temp_dir.path().join("alice.recovery");
    let recovery_str = recovery_path.to_string_lossy().to_string();
    let homeserver_pk = network.homeserver().public_key().to_string();

    run_cli_dynamic(
        &[
            "tools",
            "generate-recovery",
            &recovery_str,
            "--passphrase",
            passphrase,
        ],
        env.clone(),
    )
    .await?;

    let signup_out = run_cli_dynamic(
        &["user", "signup", &homeserver_pk, &recovery_str, "--testnet"],
        env.clone(),
    )
    .await?;
    assert!(
        String::from_utf8_lossy(&signup_out.stdout).contains("Signup successful"),
        "unexpected signup output: {}",
        String::from_utf8_lossy(&signup_out.stdout)
    );

    let signin_out =
        run_cli_dynamic(&["user", "signin", &recovery_str, "--testnet"], env.clone()).await?;
    assert!(
        String::from_utf8_lossy(&signin_out.stdout).contains("Signin successful"),
        "unexpected signin output: {}",
        String::from_utf8_lossy(&signin_out.stdout)
    );

    let session_out = run_cli_dynamic(
        &["user", "session", &recovery_str, "--testnet"],
        env.clone(),
    )
    .await?;
    assert!(
        String::from_utf8_lossy(&session_out.stdout).contains("Session information"),
        "unexpected session output: {}",
        String::from_utf8_lossy(&session_out.stdout)
    );

    let signout_out = run_cli_dynamic(
        &["user", "signout", &recovery_str, "--testnet"],
        env.clone(),
    )
    .await?;
    assert!(
        String::from_utf8_lossy(&signout_out.stdout).contains("Signed out of homeserver"),
        "unexpected signout output: {}",
        String::from_utf8_lossy(&signout_out.stdout)
    );

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[serial]
async fn user_list_includes_uploaded_file() -> Result<()> {
    let network = start_testnet().await?;
    let passphrase = "demo-pass";
    let env = user_env(passphrase, &network);
    sleep(Duration::from_millis(500)).await;

    let temp_dir = tempdir().context("create temp dir")?;
    let recovery_path = temp_dir.path().join("user.recovery");
    let recovery_str = recovery_path.to_string_lossy().to_string();
    let homeserver_pk = network.homeserver().public_key().to_string();

    run_cli_dynamic(
        &[
            "tools",
            "generate-recovery",
            &recovery_str,
            "--passphrase",
            passphrase,
        ],
        env.clone(),
    )
    .await?;

    run_cli_dynamic(
        &["user", "signup", &homeserver_pk, &recovery_str, "--testnet"],
        env.clone(),
    )
    .await?;

    let recovery_bytes =
        std::fs::read(&recovery_path).context("read recovery file generated via CLI")?;
    let keypair =
        recovery_file::decrypt_recovery_file(&recovery_bytes, passphrase).context("decrypt")?;

    let sdk = network.sdk().context("build sdk facade")?;
    let signer = sdk.signer(keypair.clone());
    let session = signer.signin().await?;
    session
        .storage()
        .put("/pub/app/data.txt", "contents")
        .await
        .context("upload file for list test")?;
    session.signout().await.map_err(|(err, _)| err)?;

    let list_url = format!("pubky://{}/pub/app/", keypair.public_key());
    let list_output =
        run_cli_dynamic(&["user", "list", &list_url, "--testnet", "--shallow"], env).await?;
    let out = String::from_utf8_lossy(&list_output.stdout);
    assert!(
        out.contains("pubky://") && out.contains("data.txt"),
        "expected list to contain uploaded file, got: {}",
        out
    );

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[serial]
async fn user_publish_data() -> Result<()> {
    let network = start_testnet().await?;
    let passphrase = "demo-pass";
    let env = user_env(passphrase, &network);
    sleep(Duration::from_millis(500)).await;

    let temp_dir = tempdir().context("create temp dir")?;
    let recovery_path = temp_dir.path().join("user.recovery");
    let recovery_str = recovery_path.to_string_lossy().to_string();
    let homeserver_pk = network.homeserver().public_key().to_string();

    // Generate recovery file
    run_cli_dynamic(
        &[
            "tools",
            "generate-recovery",
            &recovery_str,
            "--passphrase",
            passphrase,
        ],
        env.clone(),
    )
    .await?;

    // Signup user
    run_cli_dynamic(
        &["user", "signup", &homeserver_pk, &recovery_str, "--testnet"],
        env.clone(),
    )
    .await?;

    // Create a temporary file to publish
    let file_path = temp_dir.path().join("data.txt");
    let file_content = "test publish data";
    std::fs::write(&file_path, file_content).context("write test file")?;

    // Publish the file
    let pubky_url = "/pub/app/data.txt";
    let publish_output = run_cli_dynamic(
        &[
            "user",
            "publish",
            &pubky_url,
            file_path.to_str().unwrap(),
            &recovery_str,
            "--testnet",
        ],
        env.clone(),
    )
    .await?;
    let publish_stdout = String::from_utf8_lossy(&publish_output.stdout);
    assert!(
        publish_stdout.contains("Data published successfully"),
        "unexpected publish output: {}",
        publish_stdout
    );

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[serial]
async fn user_get_data() -> Result<()> {
    let network = start_testnet().await?;
    let passphrase = "demo-pass";
    let env = user_env(passphrase, &network);
    sleep(Duration::from_millis(500)).await;

    let temp_dir = tempdir().context("create temp dir")?;
    let recovery_path = temp_dir.path().join("user.recovery");
    let recovery_str = recovery_path.to_string_lossy().to_string();
    let homeserver_pk = network.homeserver().public_key().to_string();

    // Generate recovery file
    run_cli_dynamic(
        &[
            "tools",
            "generate-recovery",
            &recovery_str,
            "--passphrase",
            passphrase,
        ],
        env.clone(),
    )
    .await?;

    // Signup user
    run_cli_dynamic(
        &["user", "signup", &homeserver_pk, &recovery_str, "--testnet"],
        env.clone(),
    )
    .await?;

    // Create and publish a file
    let file_path = temp_dir.path().join("data.txt");
    let file_content = "test get data";
    std::fs::write(&file_path, file_content).context("write test file")?;
    let pubky_url = "/pub/app/data.txt";
    run_cli_dynamic(
        &[
            "user",
            "publish",
            &pubky_url,
            file_path.to_str().unwrap(),
            &recovery_str,
            "--testnet",
        ],
        env.clone(),
    )
    .await?;

    // Get the file
    let get_output = run_cli_dynamic(
        &["user", "get", &pubky_url, &recovery_str, "--testnet"],
        env.clone(),
    )
    .await?;
    let get_stdout = String::from_utf8_lossy(&get_output.stdout);
    assert!(
        get_stdout.contains(file_content),
        "unexpected get output: {}",
        get_stdout
    );

    Ok(())
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[serial]
async fn user_delete_data() -> Result<()> {
    let network = start_testnet().await?;
    let passphrase = "demo-pass";
    let env = user_env(passphrase, &network);
    sleep(Duration::from_millis(500)).await;

    let temp_dir = tempdir().context("create temp dir")?;
    let recovery_path = temp_dir.path().join("user.recovery");
    let recovery_str = recovery_path.to_string_lossy().to_string();
    let homeserver_pk = network.homeserver().public_key().to_string();

    // Generate recovery file
    run_cli_dynamic(
        &[
            "tools",
            "generate-recovery",
            &recovery_str,
            "--passphrase",
            passphrase,
        ],
        env.clone(),
    )
    .await?;

    // Signup user
    run_cli_dynamic(
        &["user", "signup", &homeserver_pk, &recovery_str, "--testnet"],
        env.clone(),
    )
    .await?;

    // Create and publish a file
    let file_path = temp_dir.path().join("data.txt");
    let file_content = "test delete data";
    std::fs::write(&file_path, file_content).context("write test file")?;
    let pubky_url = "/pub/app/data.txt";
    run_cli_dynamic(
        &[
            "user",
            "publish",
            &pubky_url,
            file_path.to_str().unwrap(),
            &recovery_str,
            "--testnet",
        ],
        env.clone(),
    )
    .await?;

    // Delete the file
    let delete_output = run_cli_dynamic(
        &["user", "delete", &pubky_url, &recovery_str, "--testnet"],
        env.clone(),
    )
    .await?;
    let delete_stdout = String::from_utf8_lossy(&delete_output.stdout);
    assert!(
        delete_stdout.contains("Data deleted successfully"),
        "unexpected delete output: {}",
        delete_stdout
    );

    Ok(())
}

const PASS_ENV: &str = "PUBKY_ADMIN_PASSWORD";
const RECOVERY_PASS_ENV: &str = "PUBKY_CLI_RECOVERY_PASSPHRASE";
const PKARR_BOOTSTRAP_ENV: &str = "PUBKY_PKARR_BOOTSTRAP";
const PKARR_RELAYS_ENV: &str = "PUBKY_PKARR_RELAYS";

fn admin_env() -> &'static [(&'static str, &'static str)] {
    &[(PASS_ENV, "admin")]
}

fn user_env(passphrase: &str, network: &EphemeralTestnet) -> Vec<(&'static str, String)> {
    let mut env = vec![(PASS_ENV, "admin".to_string())];
    env.push((RECOVERY_PASS_ENV, passphrase.to_string()));

    let bootstrap = network
        .testnet
        .dht_bootstrap_nodes()
        .iter()
        .map(|node| {
            let s = node.to_string();
            if let Some((host, port)) = s.split_once(':') {
                let host = if host == "0.0.0.0" { "127.0.0.1" } else { host };
                format!("{}:{}", host, port)
            } else {
                s
            }
        })
        .collect::<Vec<_>>();
    if !bootstrap.is_empty() {
        env.push((PKARR_BOOTSTRAP_ENV, bootstrap.join(",")));
    }

    let relays = network
        .testnet
        .dht_relay_urls()
        .iter()
        .map(|url| url.to_string())
        .collect::<Vec<_>>();
    if !relays.is_empty() {
        env.push((PKARR_RELAYS_ENV, relays.join(",")));
    }

    env
}

async fn run_cli_static(args: &[&str], envs: &[(&str, &str)]) -> Result<Output> {
    let env_vec = envs
        .iter()
        .map(|(k, v)| ((*k).to_string(), (*v).to_string()))
        .collect::<Vec<_>>();
    run_cli_internal(args, env_vec).await
}

async fn run_cli_dynamic(args: &[&str], envs: Vec<(&'static str, String)>) -> Result<Output> {
    let env_vec = envs
        .into_iter()
        .map(|(k, v)| (k.to_string(), v))
        .collect::<Vec<_>>();
    run_cli_internal(args, env_vec).await
}

async fn run_cli_internal(args: &[&str], env_vec: Vec<(String, String)>) -> Result<Output> {
    let args_vec = args.iter().map(|s| s.to_string()).collect::<Vec<_>>();

    tokio::task::spawn_blocking(move || {
        let mut cmd = Command::cargo_bin("pubky-cli")?;
        for arg in args_vec {
            cmd.arg(arg);
        }
        for (key, value) in env_vec {
            cmd.env(key, value);
        }

        let output = cmd.output().context("run cli command")?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("CLI exited with status {:?}: {}", output.status, stderr);
        }
        Ok::<Output, anyhow::Error>(output)
    })
    .await
    .expect("spawn_blocking panicked")
}

async fn fetch_info(admin_url: &str, password: &str) -> Result<AdminInfo> {
    let url = format!("{}/info", admin_url.trim_end_matches('/'));
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .header("X-Admin-Password", password)
        .send()
        .await
        .context("send admin info request")?
        .error_for_status()
        .context("admin info response status")?;

    let info = response
        .json::<AdminInfo>()
        .await
        .context("decode admin info")?;
    Ok(info)
}

fn admin_base_url(network: &EphemeralTestnet) -> String {
    format!("http://{}", network.homeserver().admin().listen_socket())
}

async fn start_testnet() -> Result<EphemeralTestnet> {
    const MAX_ATTEMPTS: usize = 5;
    let mut last_err: Option<anyhow::Error> = None;

    for _attempt in 0..MAX_ATTEMPTS {
        match EphemeralTestnet::start_minimal().await {
            Ok(mut network) => {
                if let Err(err) = network.testnet.create_pkarr_relay().await {
                    last_err = Some(err.into());
                    sleep(Duration::from_millis(250)).await;
                    continue;
                }

                match network.testnet.create_homeserver().await {
                    Ok(_) => {
                        return Ok(network);
                    }
                    Err(err) => {
                        last_err = Some(err);
                        sleep(Duration::from_millis(250)).await;
                        continue;
                    }
                }
            }
            Err(err) => {
                last_err = Some(err);
                sleep(Duration::from_millis(250)).await;
                continue;
            }
        }
    }

    Err(last_err.unwrap_or_else(|| anyhow!("failed to start testnet"))).context("start homeserver")
}
