/// Example: Connect to a homeserver URL spun up by Publar and perform write/read operations
///
/// This example demonstrates:
/// 1. Taking a homeserver URL from Publar
/// 2. Creating a client with a random keypair
/// 3. Connecting the client to the homeserver
/// 4. Writing data to the homeserver
/// 5. Reading data back from the homeserver
///
/// Usage:
///   cargo run --example testnet_write_read <homeserver_url> <homeserver_pubkey>
///
/// Example:
///   cargo run --example testnet_write_read http://localhost:5111/ 8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo
use anyhow::{Context, Result};
use pubky::{Keypair, Pubky, PublicKey};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Get homeserver URL and public key from command-line arguments
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 {
        eprintln!("Usage: {} <homeserver_url> <homeserver_pubkey>", args[0]);
        eprintln!("\nExample:");
        eprintln!(
            "  {} http://localhost:5111/ 8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo",
            args[0]
        );
        eprintln!("\nYou can find the homeserver URL and public key in the Publar app");
        eprintln!("after creating a homeserver in the network visualization.");
        std::process::exit(1);
    }

    let homeserver_url = &args[1];
    let homeserver_pubkey_str = &args[2];

    println!("🚀 Connecting to homeserver...");
    println!("  URL: {}", homeserver_url);

    // Wait for homeserver to be ready
    println!("\n⏳ Checking if homeserver is ready...");
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;

    // Poll homeserver until ready
    let mut ready = false;
    for i in 1..=10 {
        match reqwest::get(homeserver_url).await {
            Ok(response)
                if response.status().is_success() || response.status().is_client_error() =>
            {
                ready = true;
                break;
            }
            _ => {
                if i < 10 {
                    println!("  Attempt {}/10: Not ready yet, waiting...", i);
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                }
            }
        }
    }

    if !ready {
        anyhow::bail!("Homeserver failed to become ready after 10 attempts");
    }
    println!("✓ Homeserver is ready");

    // Parse the homeserver public key
    println!("\n📡 Parsing homeserver public key...");
    let homeserver_pubkey = PublicKey::try_from(homeserver_pubkey_str.as_str())
        .context("Failed to parse homeserver public key")?;
    println!("✓ Homeserver public key: {}", homeserver_pubkey.to_z32());

    println!("\n👤 Creating client...");
    let client_keypair = Keypair::random();
    let client_pubkey = client_keypair.public_key();
    println!("✓ Client created:");
    println!("  Public Key: {}", client_pubkey.to_z32());

    println!("\n🔗 Connecting client to homeserver...");
    // Create Pubky client (for testnet, this should use testnet config)
    let pubky = Pubky::testnet().context("Failed to create Pubky client")?;

    // Sign up to the homeserver
    let session = pubky
        .signer(client_keypair.clone())
        .signup(&homeserver_pubkey, None)
        .await
        .context("Failed to sign up to homeserver")?;
    println!("✓ Client connected to homeserver");

    // Write data
    println!("\n📝 Writing data to homeserver...");
    let test_path = "/pub/publar/example.txt";
    let test_content = "Hello from Pubky! This is a test write/read operation from the example.";

    session
        .storage()
        .put(test_path, test_content.as_bytes().to_vec())
        .await
        .context("Failed to write data to homeserver")?;
    println!("✓ Data written to path: {}", test_path);
    println!("  Content: \"{}\"", test_content);

    // Read data back
    println!("\n📖 Reading data from homeserver...");
    let response = session
        .storage()
        .get(test_path)
        .await
        .context("Failed to read data from homeserver")?;

    let read_data = response
        .bytes()
        .await
        .context("Failed to extract bytes from response")?
        .to_vec();

    let read_content = String::from_utf8_lossy(&read_data);
    println!("✓ Data read from path: {}", test_path);
    println!("  Content: \"{}\"", read_content);
    println!("  Size: {} bytes", read_data.len());

    // Verify data matches
    if read_content == test_content {
        println!("\n✅ SUCCESS: Read data matches written data!");
    } else {
        println!("\n❌ ERROR: Read data does not match written data!");
        println!("  Expected: \"{}\"", test_content);
        println!("  Got: \"{}\"", read_content);
    }

    println!("\n🎉 Example complete!");

    Ok(())
}
