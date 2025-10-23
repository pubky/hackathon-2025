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
    /// Load built-in scenarios (loads from scenarios/ directory)
    pub fn built_in_scenarios() -> Vec<Scenario> {
        Self::load_from_directory()
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
