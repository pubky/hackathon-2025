use anyhow::{Context, Result};
use pubky_testnet::Testnet;
use pubky::{Keypair, PublicKey, PubkySession};
use std::sync::Arc;

pub struct HomeserverInfo {
    pub port: u16,
    pub public_key: String,
    pub http_url: String,
}

pub struct ClientInfo {
    pub public_key: String,
    pub keypair: Keypair,
}

/// Manager for pubky-testnet
pub struct TestnetManager {
    testnet: Option<Testnet>,
}

impl TestnetManager {
    pub fn new() -> Self {
        Self {
            testnet: None,
        }
    }

    /// Initialize the testnet
    pub async fn start(&mut self) -> Result<()> {
        let testnet = Testnet::new().await
            .context("Failed to create testnet")?;

        self.testnet = Some(testnet);

        Ok(())
    }

    /// Create a new homeserver
    pub async fn create_homeserver(&mut self) -> Result<HomeserverInfo> {
        let testnet = self
            .testnet
            .as_mut()
            .ok_or_else(|| anyhow::anyhow!("Testnet not initialized. Call start() first."))?;

        let homeserver = testnet.create_homeserver().await
            .context("Failed to create homeserver in testnet")?;

        // Extract port and URL
        let url = homeserver.icann_http_url();
        let port = url.port().unwrap_or(80);
        let http_url = url.to_string();

        Ok(HomeserverInfo {
            port,
            public_key: homeserver.public_key().to_z32(),
            http_url,
        })
    }

    /// Create a new client
    pub async fn create_client(&mut self) -> Result<ClientInfo> {
        // Generate a new keypair for the client
        let keypair = Keypair::random();
        let public_key = keypair.public_key().to_z32();

        Ok(ClientInfo {
            public_key,
            keypair,
        })
    }

    /// Connect a client to a homeserver and return the session
    pub async fn connect_client(
        &self,
        client_keypair: &Keypair,
        homeserver_pubkey: &str,
    ) -> Result<Arc<PubkySession>> {
        // Get the testnet instance
        let testnet = self
            .testnet
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Testnet not initialized. Call start() first."))?;

        // Create Pubky SDK instance using THIS testnet's DHT configuration
        let pubky = testnet.sdk()
            .context("Failed to create Pubky SDK from testnet")?;

        // Parse homeserver public key
        let homeserver_pk = PublicKey::try_from(homeserver_pubkey)
            .context("Invalid homeserver public key")?;

        // Sign up to the homeserver (no token needed for testnet)
        // This creates the account and returns a session that can be reused
        let session = pubky.signer(client_keypair.clone())
            .signup(&homeserver_pk, None)
            .await
            .context("Failed to connect client to homeserver")?;

        Ok(Arc::new(session))
    }

    /// Write data to a homeserver using an existing session
    pub async fn write_to_homeserver(
        &self,
        session: &PubkySession,
        path: &str,
        content: &[u8],
    ) -> Result<()> {
        // Use the existing session - no need to signup again!
        session.storage()
            .put(path, content.to_vec())
            .await
            .context("Failed to write to homeserver")?;

        Ok(())
    }

    /// Read data from a homeserver using an existing session
    pub async fn read_from_homeserver(
        &self,
        session: &PubkySession,
        path: &str,
    ) -> Result<Vec<u8>> {
        // Use the existing session - no need to signup again!
        let response = session.storage()
            .get(path)
            .await
            .context("Failed to read from homeserver")?;

        let data = response.bytes()
            .await
            .context("Failed to extract bytes from response")?
            .to_vec();

        Ok(data)
    }

    /// Stop the entire testnet
    pub async fn stop(&mut self) {
        self.testnet = None;
    }

    /// Bulk create multiple homeservers
    #[allow(dead_code)]
    pub async fn create_homeservers_bulk(&mut self, count: usize) -> Result<Vec<HomeserverInfo>> {
        let mut homeservers = Vec::with_capacity(count);
        for _ in 0..count {
            let homeserver = self.create_homeserver().await?;
            homeservers.push(homeserver);
        }
        Ok(homeservers)
    }

    /// Bulk create multiple clients
    #[allow(dead_code)]
    pub async fn create_clients_bulk(&mut self, count: usize) -> Result<Vec<ClientInfo>> {
        let mut clients = Vec::with_capacity(count);
        for _ in 0..count {
            let client = self.create_client().await?;
            clients.push(client);
        }
        Ok(clients)
    }

    /// Simulate indexer test scenario: create clients, connect them to homeservers, and write test data
    /// Returns: Vec<(client_pubkey, homeserver_pubkey, homeserver_url, session)>
    #[allow(dead_code)]
    pub async fn simulate_indexer_scenario(
        &mut self,
        num_homeservers: usize,
        clients_per_homeserver: usize,
        files_per_client: usize,
    ) -> Result<Vec<(String, String, String, Arc<PubkySession>)>> {
        let mut results = Vec::new();

        // Create homeservers
        let homeservers = self.create_homeservers_bulk(num_homeservers).await?;

        for homeserver in &homeservers {
            // Create clients for this homeserver
            let clients = self.create_clients_bulk(clients_per_homeserver).await?;

            for client in clients {
                // Connect client to homeserver
                let session = self.connect_client(&client.keypair, &homeserver.public_key).await?;

                // Write test files
                for i in 0..files_per_client {
                    let path = format!("/pub/publar/test_file_{}.txt", i);
                    let content = format!("Test data from client {} file {}", client.public_key, i);
                    self.write_to_homeserver(&session, &path, content.as_bytes()).await?;
                }

                results.push((
                    client.public_key.clone(),
                    homeserver.public_key.clone(),
                    homeserver.http_url.clone(),
                    session,
                ));
            }
        }

        Ok(results)
    }

    /// Get all homeserver URLs for external indexer configuration
    #[allow(dead_code)]
    pub fn export_homeserver_urls(&self, homeservers: &[HomeserverInfo]) -> Vec<String> {
        homeservers.iter().map(|h| h.http_url.clone()).collect()
    }
}
