use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Scenario {
    pub name: String,
    pub description: String,
    pub operations: Vec<Operation>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Operation {
    /// Seconds from scenario start to execute this operation
    pub at_seconds: f64,
    #[serde(flatten)]
    pub action: Action,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    CreateHomeserver {
        id: String,
    },
    CreateClient {
        id: String,
    },
    ConnectClient {
        client_id: String,
        homeserver_id: String,
    },
    WriteData {
        client_id: String,
        path: String,
        content: String,
    },
    ReadData {
        client_id: String,
        path: String,
    },
    /// Wait for a homeserver to be ready to accept connections
    WaitForHomeserver {
        homeserver_id: String,
        /// Maximum time to wait in seconds
        timeout_seconds: f64,
    },
}

impl Scenario {
    /// Load built-in scenarios (now loads from scenarios/ directory)
    pub fn built_in_scenarios() -> Vec<Scenario> {
        // First try to load from scenarios directory
        let mut scenarios = Self::load_from_directory();

        // If no scenarios were loaded from files, fall back to hardcoded scenarios
        if scenarios.is_empty() {
            scenarios = vec![
            Scenario {
                name: "Quick Demo".to_string(),
                description: "Creates 2 homeservers, 2 clients, and demonstrates read/write".to_string(),
                operations: vec![
                    Operation {
                        at_seconds: 0.0,
                        action: Action::CreateHomeserver {
                            id: "homeserver-1".to_string(),
                        },
                    },
                    Operation {
                        at_seconds: 1.0,
                        action: Action::CreateHomeserver {
                            id: "homeserver-2".to_string(),
                        },
                    },
                    // Wait for homeservers to be ready
                    Operation {
                        at_seconds: 2.0,
                        action: Action::WaitForHomeserver {
                            homeserver_id: "homeserver-1".to_string(),
                            timeout_seconds: 5.0,
                        },
                    },
                    Operation {
                        at_seconds: 2.0,
                        action: Action::WaitForHomeserver {
                            homeserver_id: "homeserver-2".to_string(),
                            timeout_seconds: 5.0,
                        },
                    },
                    Operation {
                        at_seconds: 2.5,
                        action: Action::CreateClient {
                            id: "client-1".to_string(),
                        },
                    },
                    Operation {
                        at_seconds: 3.0,
                        action: Action::CreateClient {
                            id: "client-2".to_string(),
                        },
                    },
                    Operation {
                        at_seconds: 3.5,
                        action: Action::ConnectClient {
                            client_id: "client-1".to_string(),
                            homeserver_id: "homeserver-1".to_string(),
                        },
                    },
                    Operation {
                        at_seconds: 4.0,
                        action: Action::ConnectClient {
                            client_id: "client-2".to_string(),
                            homeserver_id: "homeserver-2".to_string(),
                        },
                    },
                    Operation {
                        at_seconds: 5.0,
                        action: Action::WriteData {
                            client_id: "client-1".to_string(),
                            path: "/pub/publar/demo.txt".to_string(),
                            content: "Hello from client 1!".to_string(),
                        },
                    },
                    Operation {
                        at_seconds: 6.0,
                        action: Action::WriteData {
                            client_id: "client-2".to_string(),
                            path: "/pub/publar/demo.txt".to_string(),
                            content: "Hello from client 2!".to_string(),
                        },
                    },
                    Operation {
                        at_seconds: 7.0,
                        action: Action::ReadData {
                            client_id: "client-1".to_string(),
                            path: "/pub/publar/demo.txt".to_string(),
                        },
                    },
                ],
            },
            Scenario {
                name: "Indexer Stress Test".to_string(),
                description: "Creates 5 homeservers with 3 clients each, all writing data".to_string(),
                operations: {
                    let mut ops = Vec::new();
                    let mut time = 0.0;

                    // Create 5 homeservers
                    for i in 1..=5 {
                        ops.push(Operation {
                            at_seconds: time,
                            action: Action::CreateHomeserver {
                                id: format!("homeserver-{}", i),
                            },
                        });
                        time += 0.5;
                    }

                    // Create 15 clients (3 per homeserver)
                    for i in 1..=15 {
                        ops.push(Operation {
                            at_seconds: time,
                            action: Action::CreateClient {
                                id: format!("client-{}", i),
                            },
                        });
                        time += 0.3;
                    }

                    // Connect clients to homeservers
                    time += 1.0;
                    for i in 1..=15 {
                        let homeserver_idx = ((i - 1) / 3) + 1;
                        ops.push(Operation {
                            at_seconds: time,
                            action: Action::ConnectClient {
                                client_id: format!("client-{}", i),
                                homeserver_id: format!("homeserver-{}", homeserver_idx),
                            },
                        });
                        time += 0.5;
                    }

                    // Write data from each client
                    time += 1.0;
                    for i in 1..=15 {
                        for j in 1..=3 {
                            ops.push(Operation {
                                at_seconds: time,
                                action: Action::WriteData {
                                    client_id: format!("client-{}", i),
                                    path: format!("/pub/publar/file_{}.txt", j),
                                    content: format!("Data from client {} file {}", i, j),
                                },
                            });
                            time += 0.2;
                        }
                    }

                    ops
                },
            },
            Scenario {
                name: "Rate Limiting".to_string(),
                description: "Creates 1 homeserver with 5 clients, each writing 10 times rapidly to test rate limiting".to_string(),
                operations: {
                    let mut ops = Vec::new();
                    let mut time = 0.0;

                    // Create 1 homeserver
                    ops.push(Operation {
                        at_seconds: time,
                        action: Action::CreateHomeserver {
                            id: "homeserver-1".to_string(),
                        },
                    });
                    time += 1.0;

                    // Wait for homeserver to be ready
                    ops.push(Operation {
                        at_seconds: time,
                        action: Action::WaitForHomeserver {
                            homeserver_id: "homeserver-1".to_string(),
                            timeout_seconds: 5.0,
                        },
                    });
                    time += 1.0;

                    // Create 5 clients
                    for i in 1..=5 {
                        ops.push(Operation {
                            at_seconds: time,
                            action: Action::CreateClient {
                                id: format!("client-{}", i),
                            },
                        });
                        time += 0.05; // Stagger client creation
                    }
                    time += 0.5; // Small pause after client creation

                    // Connect all 5 clients to the homeserver rapidly (sequentially)
                    for i in 1..=5 {
                        ops.push(Operation {
                            at_seconds: time,
                            action: Action::ConnectClient {
                                client_id: format!("client-{}", i),
                                homeserver_id: "homeserver-1".to_string(),
                            },
                        });
                        time += 0.01; // Very small delay (10ms) between connections
                    }
                    time += 0.5; // Small pause after connections

                    // Each client writes 10 times rapidly within 5 seconds
                    let write_start_time = time;
                    for i in 1..=5 {
                        for j in 1..=10 {
                            // Spread writes across 5 seconds, but with some overlap
                            let write_time = write_start_time + (j as f64 * 0.5) + (i as f64 * 0.02);
                            ops.push(Operation {
                                at_seconds: write_time,
                                action: Action::WriteData {
                                    client_id: format!("client-{}", i),
                                    path: format!("/pub/publar/rate_test_{}.txt", j),
                                    content: format!("Rate test data from client {} write {}", i, j),
                                },
                            });
                        }
                    }

                    ops
                },
            },
            ];
        }

        scenarios
    }

    /// Save scenario to JSON file
    #[allow(dead_code)]
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    /// Load scenario from JSON
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }

    /// Load scenario from a JSON file
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self, Box<dyn std::error::Error>> {
        let json = fs::read_to_string(path)?;
        let scenario = Self::from_json(&json)?;
        Ok(scenario)
    }

    /// Save scenario to a JSON file
    #[allow(dead_code)]
    pub fn to_file<P: AsRef<Path>>(&self, path: P) -> Result<(), Box<dyn std::error::Error>> {
        let json = self.to_json()?;
        fs::write(path, json)?;
        Ok(())
    }

    /// Get the scenarios directory path (~/.publar/scenarios)
    pub fn scenarios_dir() -> PathBuf {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string());

        PathBuf::from(home).join(".publar").join("scenarios")
    }

    /// Load all scenarios from the scenarios directory
    pub fn load_from_directory() -> Vec<Scenario> {
        let mut scenarios = Vec::new();

        let scenarios_dir = Self::scenarios_dir();
        if !scenarios_dir.exists() {
            // Create the directory if it doesn't exist
            if let Err(e) = fs::create_dir_all(&scenarios_dir) {
                eprintln!("Failed to create scenarios directory: {}", e);
                return scenarios;
            }
            println!("Created scenarios directory at: {:?}", scenarios_dir);
        }

        match fs::read_dir(&scenarios_dir) {
            Ok(entries) => {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|s| s.to_str()) == Some("json") {
                        match Self::from_file(&path) {
                            Ok(scenario) => {
                                println!("Loaded scenario: {}", scenario.name);
                                scenarios.push(scenario);
                            }
                            Err(e) => {
                                eprintln!("Failed to load scenario from {:?}: {}", path, e);
                            }
                        }
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to read scenarios directory: {}", e);
            }
        }

        scenarios
    }

    /// List available scenario files in the scenarios directory
    #[allow(dead_code)]
    pub fn list_scenario_files() -> Vec<PathBuf> {
        let mut files = Vec::new();
        let scenarios_dir = Self::scenarios_dir();

        if let Ok(entries) = fs::read_dir(&scenarios_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    files.push(path);
                }
            }
        }

        files
    }
}
