mod components;
mod testnet;
mod api;
mod scenario;
mod force_layout;

use dioxus::prelude::*;
use components::{Topbar, NetworkVisualization, ContextSidebar, EventLogEntry, EventType};
use components::network_visualization::{Node, Homeserver, Client, Edge, NodeStatus, ConnectivityStatus, StorageStats, EdgeType};
use testnet::TestnetManager;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use pubky::Keypair;
use chrono::Local;
use force_layout::calculate_initial_position;
fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Configure desktop window
    let config = dioxus::desktop::Config::new()
        .with_window(
            dioxus::desktop::WindowBuilder::new()
                .with_title("Publar")
                .with_inner_size(dioxus::desktop::LogicalSize::new(800, 600))
                .with_always_on_top(false)
        );

    dioxus::LaunchBuilder::desktop()
        .with_cfg(config)
        .launch(App);
}

#[component]
fn App() -> Element {
    // State management
    let mut is_network_running = use_signal(|| false);
    let mut nodes = use_signal(|| Vec::<Node>::new());
    let mut edges = use_signal(|| Vec::<Edge>::new());
    let mut selected_node_id = use_signal(|| Option::<String>::None);
    let mut is_creating_homeserver = use_signal(|| false);
    let mut is_creating_client = use_signal(|| false);

    // Store client keypairs (can't be cloned/stored in Node struct)
    let client_keypairs: Signal<Arc<Mutex<HashMap<String, Keypair>>>> =
        use_signal(|| Arc::new(Mutex::new(HashMap::new())));

    // Store client sessions for reuse
    let client_sessions: Signal<Arc<Mutex<HashMap<String, Arc<pubky::PubkySession>>>>> =
        use_signal(|| Arc::new(Mutex::new(HashMap::new())));

    // Store the testnet manager
    let testnet_manager: Signal<Arc<Mutex<TestnetManager>>> =
        use_signal(|| Arc::new(Mutex::new(TestnetManager::new())));

    // Store homeserver URLs for API
    let homeserver_urls: Signal<Arc<Mutex<Vec<String>>>> =
        use_signal(|| Arc::new(Mutex::new(Vec::new())));

    // Scenario state
    let scenarios = use_signal(|| scenario::Scenario::built_in_scenarios());
    let mut selected_scenario_idx = use_signal(|| Option::<usize>::None);
    let mut is_playing_scenario = use_signal(|| false);

    // Event log state
    let mut event_log = use_signal(|| Vec::<EventLogEntry>::new());
    let event_counter = use_signal(|| 0_usize);

    // Loading states for write/read operations
    let is_writing = use_signal(|| false);
    let is_reading = use_signal(|| false);

    // Notification state
    let mut notification_message = use_signal(|| Option::<String>::None);

    // Auto-dismiss notification after 3 seconds
    use_effect(move || {
        if notification_message().is_some() {
            spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
                notification_message.set(None);
            });
        }
    });

    // Resize state for sidebar and event log
    let mut sidebar_width = use_signal(|| 320); // 20rem = 320px
    let mut event_log_height = use_signal(|| 256); // 16rem = 256px
    let mut is_resizing_sidebar = use_signal(|| false);
    let mut is_resizing_eventlog = use_signal(|| false);
    let mut resize_start_x = use_signal(|| 0.0);
    let mut resize_start_y = use_signal(|| 0.0);
    let mut resize_start_width = use_signal(|| 0);
    let mut resize_start_height = use_signal(|| 0);

    // Computed: Get selected node
    let selected_node = use_memo(move || {
        let id = selected_node_id.read();
        let all_nodes = nodes.read();
        id.as_ref()
            .and_then(|id| all_nodes.iter().find(|n| n.id() == id))
            .cloned()
    });

    // Force-directed layout simulation (runs periodically)
    use_effect(move || {
        if nodes.read().len() > 1 {
            spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

                // Build edge list from current edges
                let edge_list: Vec<(String, String)> = edges
                    .read()
                    .iter()
                    .map(|e| (e.from.clone(), e.to.clone()))
                    .collect();

                // Create layout simulation
                let mut layout = force_layout::ForceLayout::from_nodes(&nodes.read(), &edge_list);

                // Run simulation step
                layout.tick();

                // Update node positions
                let positions = layout.get_positions();
                for (node_id, new_x, new_y) in positions {
                    if let Some(node) = nodes.write().iter_mut().find(|n| n.id() == node_id) {
                        node.set_position(new_x, new_y);
                    }
                }
            });
        }
    });

    // Handler: Toggle network
    let toggle_network = move |_| {
        let running = is_network_running();
        let manager = testnet_manager();

        if running {
            // Stop network
            is_network_running.set(false);
            nodes.set(Vec::new());
            edges.set(Vec::new());
            selected_node_id.set(None);

            // Clear homeserver URLs
            if let Ok(mut urls) = homeserver_urls().lock() {
                urls.clear();
            }

            // Stop the testnet
            spawn(async move {
                if let Ok(mut mgr) = manager.lock() {
                    mgr.stop().await;
                }
            });
        } else {
            // Start network (initialize DHT and relays)
            let urls_for_api = homeserver_urls();
            spawn(async move {
                if let Ok(mut mgr) = manager.lock() {
                    match mgr.start().await {
                        Ok(_) => {
                            println!("Testnet started successfully");
                        }
                        Err(e) => {
                            eprintln!("Failed to start testnet: {}", e);
                        }
                    }
                }

                // Start API server
                let api_state = api::ApiState {
                    homeserver_urls: urls_for_api,
                };

                tokio::spawn(async move {
                    if let Err(e) = api::start_api_server(api_state, 3030).await {
                        eprintln!("API server error: {}", e);
                    }
                });
            });
            is_network_running.set(true);
        }
    };

    // Handler: Add homeserver
    let add_homeserver = move |_| {
        if !is_network_running() {
            return;
        }

        // Prevent concurrent homeserver creation
        if is_creating_homeserver() {
            return;
        }

        // Mark as creating
        is_creating_homeserver.set(true);

        // Count existing homeservers
        let homeserver_count = nodes.read().iter().filter(|n| matches!(n, Node::Homeserver(_))).count();
        let id = format!("homeserver-{}", homeserver_count + 1);
        let name = format!("Homeserver {}", homeserver_count + 1);

        // Calculate initial position using force-directed principles
        let (x, y) = calculate_initial_position(&nodes.read(), None);

        // Add homeserver node to UI with Starting status
        nodes.write().push(Node::Homeserver(Homeserver {
            id: id.clone(),
            name: name.clone(),
            port: 0, // Will be set when homeserver starts
            http_url: None,
            status: NodeStatus::Starting,
            public_key: None,
            connectivity_status: ConnectivityStatus::Unknown,
            storage_stats: None,
            x,
            y,
        }));

        // Create the homeserver
        let manager = testnet_manager();
        let id_clone = id.clone();
        let mut all_nodes = nodes.clone();
        let mut creating_flag = is_creating_homeserver.clone();
        let urls = homeserver_urls();

        spawn(async move {
            if let Ok(mut mgr) = manager.lock() {
                match mgr.create_homeserver().await {
                    Ok(info) => {
                        // Add URL to shared state for API
                        if let Ok(mut urls_list) = urls.lock() {
                            urls_list.push(info.http_url.clone());
                        }

                        // Update the homeserver with actual info
                        let mut nodes_write = all_nodes.write();
                        for node in nodes_write.iter_mut() {
                            if let Node::Homeserver(h) = node {
                                if h.id == id_clone {
                                    h.port = info.port;
                                    h.http_url = Some(info.http_url.clone());
                                    h.public_key = Some(info.public_key);
                                    h.status = NodeStatus::Running;
                                    break;
                                }
                            }
                        }
                        println!("Homeserver created: {} on port {}", info.http_url, info.port);
                    }
                    Err(e) => {
                        eprintln!("Failed to create homeserver: {}", e);
                        // Update status to Error
                        let mut nodes_write = all_nodes.write();
                        for node in nodes_write.iter_mut() {
                            if let Node::Homeserver(h) = node {
                                if h.id == id_clone {
                                    h.status = NodeStatus::Error;
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Clear the creating flag
            creating_flag.set(false);
        });
    };

    // Handler: Add client
    let add_client = move |_| {
        if !is_network_running() {
            return;
        }

        // Prevent concurrent client creation
        if is_creating_client() {
            return;
        }

        // Mark as creating
        is_creating_client.set(true);

        // Count existing clients
        let client_count = nodes.read().iter().filter(|n| matches!(n, Node::Client(_))).count();
        let id = format!("client-{}", client_count + 1);
        let name = format!("Client {}", client_count + 1);

        // Calculate initial position using force-directed principles
        let (x, y) = calculate_initial_position(&nodes.read(), None);

        // Add client node to UI with Starting status
        nodes.write().push(Node::Client(Client {
            id: id.clone(),
            name: name.clone(),
            public_key: String::new(), // Will be set when client is created
            status: NodeStatus::Starting,
            connected_homeserver: None,
            x,
            y,
        }));

        // Create the client
        let manager = testnet_manager();
        let id_clone = id.clone();
        let mut all_nodes = nodes.clone();
        let keypairs = client_keypairs();
        let mut creating_flag = is_creating_client.clone();

        spawn(async move {
            if let Ok(mut mgr) = manager.lock() {
                match mgr.create_client().await {
                    Ok(info) => {
                        // Store the keypair
                        if let Ok(mut kp_map) = keypairs.lock() {
                            kp_map.insert(id_clone.clone(), info.keypair);
                        }

                        // Update the client with actual info
                        let mut nodes_write = all_nodes.write();
                        for node in nodes_write.iter_mut() {
                            if let Node::Client(c) = node {
                                if c.id == id_clone {
                                    c.public_key = info.public_key;
                                    c.status = NodeStatus::Running;
                                    break;
                                }
                            }
                        }
                        println!("Client created");
                    }
                    Err(e) => {
                        eprintln!("Failed to create client: {}", e);
                        // Update status to Error
                        let mut nodes_write = all_nodes.write();
                        for node in nodes_write.iter_mut() {
                            if let Node::Client(c) = node {
                                if c.id == id_clone {
                                    c.status = NodeStatus::Error;
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Clear the creating flag
            creating_flag.set(false);
        });
    };

    // Handler: Select node
    let select_node = move |id: String| {
        selected_node_id.set(Some(id));
    };

    // Handler: Move node
    let move_node = move |(node_id, x, y): (String, f64, f64)| {
        let mut all_nodes = nodes.write();
        for node in all_nodes.iter_mut() {
            if node.id() == node_id {
                node.set_position(x, y);
                break;
            }
        }
    };

    // Handler: Stop node (not supported - nodes managed by testnet)
    let stop_node = move |_id: String| {
        println!("Stop node not yet implemented");
    };

    // Handler: Start node (not supported - nodes managed by testnet)
    let start_node = move |_id: String| {
        println!("Start node not yet implemented");
    };

    // Handler: Remove node (removes from UI only)
    let remove_node = move |id: String| {
        // Remove from UI
        let mut all_nodes = nodes.write();
        all_nodes.retain(|n| n.id() != id);
        drop(all_nodes);

        // Clear selection if removed node was selected
        let current_selection = selected_node_id();
        if current_selection.as_ref() == Some(&id) {
            selected_node_id.set(None);
        }
    };

    // Handler: Test connectivity (for homeservers only)
    let test_connectivity = move |id: String| {
        let mut all_nodes = nodes.clone();
        let id_clone = id.clone();

        // Set status to Testing
        let mut nodes_write = all_nodes.write();
        for node in nodes_write.iter_mut() {
            if let Node::Homeserver(h) = node {
                if h.id == id {
                    h.connectivity_status = ConnectivityStatus::Testing;
                    h.storage_stats = Some(StorageStats {
                        total_keys: 42, // Mock data for now
                        total_size_bytes: 1024 * 256, // 256 KB mock
                    });
                    break;
                }
            }
        }
        drop(nodes_write);

        // Simulate connectivity test
        spawn(async move {
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;

            // Update to Connected status (mock success)
            let mut nodes_write = all_nodes.write();
            for node in nodes_write.iter_mut() {
                if let Node::Homeserver(h) = node {
                    if h.id == id_clone {
                        h.connectivity_status = ConnectivityStatus::Connected;
                        break;
                    }
                }
            }
        });
    };

    // Handler: Write data to homeserver
    let write_data = move |(client_id, path, content): (String, String, String)| {
        let manager = testnet_manager();
        let sessions = client_sessions();
        let mut writing_flag = is_writing;
        let mut log = event_log;
        let mut counter = event_counter;

        spawn(async move {
            // Set loading state
            writing_flag.set(true);

            // Log the start of the operation
            let id = counter();
            counter.set(id + 1);
            let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
            log.write().push(EventLogEntry {
                id,
                timestamp: timestamp.clone(),
                message: format!("Writing data to {} at {}", client_id, path),
                event_type: EventType::Info,
            });

            // Get the client's session
            let session = {
                if let Ok(sess_map) = sessions.lock() {
                    sess_map.get(&client_id).cloned()
                } else {
                    None
                }
            };

            if let Some(session) = session {
                if let Ok(mgr) = manager.lock() {
                    match mgr.write_to_homeserver(&session, &path, content.as_bytes()).await {
                        Ok(_) => {
                            println!("Successfully wrote to path: {}", path);

                            // Log success
                            let id = counter();
                            counter.set(id + 1);
                            let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
                            log.write().push(EventLogEntry {
                                id,
                                timestamp,
                                message: format!("✓ Wrote data: {} → {}", client_id, path),
                                event_type: EventType::Success,
                            });
                        }
                        Err(e) => {
                            eprintln!("Failed to write data: {}", e);

                            // Log error
                            let id = counter();
                            counter.set(id + 1);
                            let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
                            log.write().push(EventLogEntry {
                                id,
                                timestamp,
                                message: format!("✗ Write failed: {}", e),
                                event_type: EventType::Error,
                            });
                        }
                    }
                }
            } else {
                eprintln!("Client session not found - client must be connected first");

                // Log error
                let id = counter();
                counter.set(id + 1);
                let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
                log.write().push(EventLogEntry {
                    id,
                    timestamp,
                    message: "✗ Client not connected".to_string(),
                    event_type: EventType::Error,
                });
            }

            // Clear loading state
            writing_flag.set(false);
        });
    };

    // Handler: Read data from homeserver
    let read_data = move |(client_id, path): (String, String)| {
        let manager = testnet_manager();
        let sessions = client_sessions();
        let mut reading_flag = is_reading;
        let mut log = event_log;
        let mut counter = event_counter;

        spawn(async move {
            // Set loading state
            reading_flag.set(true);

            // Log the start of the operation
            let id = counter();
            counter.set(id + 1);
            let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
            log.write().push(EventLogEntry {
                id,
                timestamp: timestamp.clone(),
                message: format!("Reading data from {} at {}", client_id, path),
                event_type: EventType::Info,
            });

            // Get the client's session
            let session = {
                if let Ok(sess_map) = sessions.lock() {
                    sess_map.get(&client_id).cloned()
                } else {
                    None
                }
            };

            if let Some(session) = session {
                if let Ok(mgr) = manager.lock() {
                    match mgr.read_from_homeserver(&session, &path).await {
                        Ok(data) => {
                            let content = String::from_utf8_lossy(&data);
                            println!("Successfully read {} bytes from path: {}", data.len(), path);
                            println!("Content: {}", content);

                            // Log success
                            let id = counter();
                            counter.set(id + 1);
                            let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
                            log.write().push(EventLogEntry {
                                id,
                                timestamp,
                                message: format!("✓ Read data: {} ← {} ({} bytes)", client_id, path, data.len()),
                                event_type: EventType::Success,
                            });

                            // Log the actual content
                            let id = counter();
                            counter.set(id + 1);
                            let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
                            log.write().push(EventLogEntry {
                                id,
                                timestamp,
                                message: format!("Content: {}", content),
                                event_type: EventType::Info,
                            });
                        }
                        Err(e) => {
                            eprintln!("Failed to read data: {}", e);

                            // Log error
                            let id = counter();
                            counter.set(id + 1);
                            let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
                            log.write().push(EventLogEntry {
                                id,
                                timestamp,
                                message: format!("✗ Read failed: {}", e),
                                event_type: EventType::Error,
                            });
                        }
                    }
                }
            } else {
                eprintln!("Client session not found - client must be connected first");

                // Log error
                let id = counter();
                counter.set(id + 1);
                let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
                log.write().push(EventLogEntry {
                    id,
                    timestamp,
                    message: "✗ Client not connected".to_string(),
                    event_type: EventType::Error,
                });
            }

            // Clear loading state
            reading_flag.set(false);
        });
    };

    // Handler: Connect client to homeserver
    let connect_client = move |(client_id, homeserver_id): (String, String)| {
        let manager = testnet_manager();
        let keypairs = client_keypairs();
        let sessions = client_sessions();
        let mut all_nodes = nodes.clone();
        let mut all_edges = edges.clone();
        let client_id_clone = client_id.clone();
        let homeserver_id_clone = homeserver_id.clone();

        spawn(async move {
            // Get the client's keypair
            let keypair = {
                if let Ok(kp_map) = keypairs.lock() {
                    kp_map.get(&client_id).cloned()
                } else {
                    None
                }
            };

            if let Some(keypair) = keypair {
                // Get the homeserver's public key
                let homeserver_pubkey = {
                    let nodes_read = all_nodes.read();
                    nodes_read.iter()
                        .find_map(|n| {
                            if let Node::Homeserver(h) = n {
                                if h.id == homeserver_id {
                                    h.public_key.clone()
                                } else {
                                    None
                                }
                            } else {
                                None
                            }
                        })
                };

                if let Some(pubkey) = homeserver_pubkey {
                    // Connect the client and get the session
                    if let Ok(mgr) = manager.lock() {
                        match mgr.connect_client(&keypair, &pubkey).await {
                            Ok(session) => {
                                println!("Client {} connected to homeserver {}", client_id_clone, homeserver_id_clone);

                                // Store the session for reuse
                                if let Ok(mut sess_map) = sessions.lock() {
                                    sess_map.insert(client_id_clone.clone(), session);
                                }

                                // Update client's connected_homeserver field
                                let mut nodes_write = all_nodes.write();
                                for node in nodes_write.iter_mut() {
                                    if let Node::Client(c) = node {
                                        if c.id == client_id_clone {
                                            c.connected_homeserver = Some(homeserver_id_clone.clone());
                                            break;
                                        }
                                    }
                                }
                                drop(nodes_write);

                                // Add an edge from client to homeserver
                                all_edges.write().push(Edge {
                                    from: client_id_clone.clone(),
                                    to: homeserver_id_clone.clone(),
                                    edge_type: EdgeType::Connection,
                                });
                            }
                            Err(e) => {
                                eprintln!("Failed to connect client to homeserver: {}", e);
                            }
                        }
                    }
                } else {
                    eprintln!("Homeserver {} not found or has no public key", homeserver_id);
                }
            } else {
                eprintln!("Client keypair not found for {}", client_id);
            }
        });
    };

    // Handler: Select scenario
    let on_scenario_select = move |idx: usize| {
        selected_scenario_idx.set(Some(idx));
    };

    // Handler: Play scenario
    let on_play_scenario = move |_| {
        if let Some(idx) = selected_scenario_idx() {
            let scenario = scenarios()[idx].clone();
            is_playing_scenario.set(true);

            println!("Playing scenario: {}", scenario.name);
            println!("Description: {}", scenario.description);
            println!("Total operations: {}", scenario.operations.len());

            // Clear existing network before starting scenario
            nodes.set(Vec::new());
            edges.set(Vec::new());
            selected_node_id.set(None);

            // Clear homeserver URLs
            if let Ok(mut urls) = homeserver_urls().lock() {
                urls.clear();
            }

            // Clear keypairs and sessions
            if let Ok(mut kp_map) = client_keypairs().lock() {
                kp_map.clear();
            }
            if let Ok(mut sess_map) = client_sessions().lock() {
                sess_map.clear();
            }

            // Clone all necessary state for async execution
            let manager = testnet_manager();
            let mut all_nodes = nodes.clone();
            let mut all_edges = edges.clone();
            let keypairs = client_keypairs.clone();
            let sessions = client_sessions.clone();
            let urls = homeserver_urls.clone();
            let mut playing_flag = is_playing_scenario.clone();
            let mut log = event_log.clone();
            let mut counter = event_counter.clone();

            spawn(async move {
                use std::time::Instant;
                use scenario::Action;

                let start_time = Instant::now();

                // Helper to log events
                let mut log_event = |message: String, event_type: EventType| {
                    let id = counter();
                    counter.set(id + 1);
                    let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
                    log.write().push(EventLogEntry {
                        id,
                        timestamp,
                        message,
                        event_type,
                    });
                };

                for op in scenario.operations {
                    // Wait until the scheduled time
                    let target_time = std::time::Duration::from_secs_f64(op.at_seconds);
                    let elapsed = start_time.elapsed();
                    if target_time > elapsed {
                        tokio::time::sleep(target_time - elapsed).await;
                    }

                    println!("[@{:.1}s] Executing: {:?}", op.at_seconds, op.action);

                    match op.action {
                        Action::CreateHomeserver { id } => {
                            if let Ok(mut mgr) = manager.lock() {
                                match mgr.create_homeserver().await {
                                    Ok(info) => {
                                        // Add to homeserver URLs
                                        if let Ok(mut urls_list) = urls.read().lock() {
                                            urls_list.push(info.http_url.clone());
                                        }

                                        // Calculate position using force-directed principles
                                        let (x, y) = calculate_initial_position(&all_nodes.read(), None);

                                        // Add node
                                        all_nodes.write().push(Node::Homeserver(Homeserver {
                                            id: id.clone(),
                                            name: format!("Homeserver {}", id),
                                            port: info.port,
                                            http_url: Some(info.http_url),
                                            status: NodeStatus::Running,
                                            public_key: Some(info.public_key),
                                            connectivity_status: ConnectivityStatus::Unknown,
                                            storage_stats: None,
                                            x,
                                            y,
                                        }));
                                        println!("  ✓ Homeserver created: {}", id);
                                        log_event(format!("Created homeserver: {}", id), EventType::Success);
                                    }
                                    Err(e) => {
                                        eprintln!("  ✗ Failed to create homeserver: {}", e);
                                        log_event(format!("Failed to create homeserver: {}", e), EventType::Error);
                                    }
                                }
                            }
                        }
                        Action::CreateClient { id } => {
                            if let Ok(mut mgr) = manager.lock() {
                                match mgr.create_client().await {
                                    Ok(info) => {
                                        // Calculate position using force-directed principles
                                        let (x, y) = calculate_initial_position(&all_nodes.read(), None);

                                        // Store keypair
                                        if let Ok(mut kp_map) = keypairs.read().lock() {
                                            kp_map.insert(id.clone(), info.keypair);
                                        }

                                        // Add node
                                        all_nodes.write().push(Node::Client(Client {
                                            id: id.clone(),
                                            name: format!("Client {}", id),
                                            public_key: info.public_key,
                                            status: NodeStatus::Running,
                                            connected_homeserver: None,
                                            x,
                                            y,
                                        }));
                                        println!("  ✓ Client created: {}", id);
                                        log_event(format!("Created client: {}", id), EventType::Success);
                                    }
                                    Err(e) => {
                                        eprintln!("  ✗ Failed to create client: {}", e);
                                        log_event(format!("Failed to create client: {}", e), EventType::Error);
                                    }
                                }
                            }
                        }
                        Action::ConnectClient { client_id, homeserver_id } => {
                            // Find homeserver public key
                            let homeserver_pubkey = {
                                all_nodes.read().iter().find_map(|n| {
                                    if let Node::Homeserver(h) = n {
                                        if h.id == homeserver_id {
                                            h.public_key.clone()
                                        } else {
                                            None
                                        }
                                    } else {
                                        None
                                    }
                                })
                            };

                            if let Some(pubkey) = homeserver_pubkey {
                                // Get client keypair
                                let keypair = {
                                    if let Ok(kp_map) = keypairs.read().lock() {
                                        kp_map.get(&client_id).cloned()
                                    } else {
                                        None
                                    }
                                };

                                if let Some(kp) = keypair {
                                    if let Ok(mgr) = manager.lock() {
                                        match mgr.connect_client(&kp, &pubkey).await {
                                            Ok(session) => {
                                                // Store session
                                                if let Ok(mut sess_map) = sessions.read().lock() {
                                                    sess_map.insert(client_id.clone(), session);
                                                }

                                                // Update client node
                                                for node in all_nodes.write().iter_mut() {
                                                    if let Node::Client(c) = node {
                                                        if c.id == client_id {
                                                            c.connected_homeserver = Some(homeserver_id.clone());
                                                            break;
                                                        }
                                                    }
                                                }

                                                // Add edge
                                                all_edges.write().push(Edge {
                                                    from: client_id.clone(),
                                                    to: homeserver_id.clone(),
                                                    edge_type: EdgeType::Connection,
                                                });
                                                println!("  ✓ Connected {} to {}", client_id, homeserver_id);
                                                log_event(format!("Connected {} → {}", client_id, homeserver_id), EventType::Success);
                                            }
                                            Err(e) => {
                                                eprintln!("  ✗ Failed to connect: {}", e);
                                                log_event(format!("Failed to connect client: {}", e), EventType::Error);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        Action::WriteData { client_id, path, content } => {
                            let session = {
                                if let Ok(sess_map) = sessions.read().lock() {
                                    sess_map.get(&client_id).cloned()
                                } else {
                                    None
                                }
                            };

                            if let Some(sess) = session {
                                if let Ok(mgr) = manager.lock() {
                                    match mgr.write_to_homeserver(&sess, &path, content.as_bytes()).await {
                                        Ok(_) => {
                                            println!("  ✓ Wrote to {}: {}", client_id, path);
                                            log_event(format!("Wrote data: {} → {}", client_id, path), EventType::Success);
                                        }
                                        Err(e) => {
                                            eprintln!("  ✗ Write failed: {}", e);
                                            log_event(format!("Write failed: {}", e), EventType::Error);
                                        }
                                    }
                                }
                            }
                        }
                        Action::ReadData { client_id, path } => {
                            let session = {
                                if let Ok(sess_map) = sessions.read().lock() {
                                    sess_map.get(&client_id).cloned()
                                } else {
                                    None
                                }
                            };

                            if let Some(sess) = session {
                                if let Ok(mgr) = manager.lock() {
                                    match mgr.read_from_homeserver(&sess, &path).await {
                                        Ok(data) => {
                                            let content = String::from_utf8_lossy(&data);
                                            println!("  ✓ Read from {}: {} = {}", client_id, path, content);
                                            log_event(format!("Read data: {} ← {}", client_id, path), EventType::Success);
                                        }
                                        Err(e) => {
                                            eprintln!("  ✗ Read failed: {}", e);
                                            log_event(format!("Read failed: {}", e), EventType::Error);
                                        }
                                    }
                                }
                            }
                        }
                        Action::WaitForHomeserver { homeserver_id, timeout_seconds } => {
                            // Find the homeserver's HTTP URL
                            let http_url = {
                                all_nodes.read().iter().find_map(|n| {
                                    if let Node::Homeserver(h) = n {
                                        if h.id == homeserver_id {
                                            h.http_url.clone()
                                        } else {
                                            None
                                        }
                                    } else {
                                        None
                                    }
                                })
                            };

                            if let Some(url) = http_url {
                                println!("  ⏳ Waiting for {} to be ready...", homeserver_id);
                                log_event(format!("Waiting for {} to be ready", homeserver_id), EventType::Info);

                                let start_wait = std::time::Instant::now();
                                let timeout = std::time::Duration::from_secs_f64(timeout_seconds);
                                let mut ready = false;

                                // Poll the homeserver until it's ready or timeout
                                while start_wait.elapsed() < timeout {
                                    if let Ok(response) = reqwest::get(&url).await {
                                        if response.status().is_success() || response.status().is_client_error() {
                                            ready = true;
                                            break;
                                        }
                                    }
                                    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                                }

                                if ready {
                                    println!("  ✓ {} is ready", homeserver_id);
                                    log_event(format!("{} is ready", homeserver_id), EventType::Success);
                                } else {
                                    eprintln!("  ✗ {} not ready after {:.1}s", homeserver_id, timeout_seconds);
                                    log_event(format!("{} not ready (timeout)", homeserver_id), EventType::Error);
                                }
                            } else {
                                eprintln!("  ✗ Homeserver {} not found", homeserver_id);
                                log_event(format!("Homeserver {} not found", homeserver_id), EventType::Error);
                            }
                        }
                    }
                }

                playing_flag.set(false);
                println!("✓ Scenario '{}' complete!", scenario.name);
            });
        }
    };

    // Handler: Reset visualization (clear nodes/clients but keep network running)
    let on_reset = move |_| {
        println!("Clearing visualization...");

        // Clear all nodes and edges
        nodes.set(Vec::new());
        edges.set(Vec::new());
        selected_node_id.set(None);

        // Clear homeserver URLs
        if let Ok(mut urls) = homeserver_urls().lock() {
            urls.clear();
        }

        // Clear keypairs and sessions
        if let Ok(mut kp_map) = client_keypairs().lock() {
            kp_map.clear();
        }
        if let Ok(mut sess_map) = client_sessions().lock() {
            sess_map.clear();
        }

        // Clear event log
        event_log.set(Vec::new());

        // Reset scenario playing flag
        is_playing_scenario.set(false);

        println!("✓ Visualization cleared (network still running)");
    };

    // Handler: Start resizing sidebar (stores initial state)
    let on_resize_sidebar = move |mouse_x: i32| {
        if mouse_x < 0 {
            // Negative value signals start of resizing
            is_resizing_sidebar.set(true);
            resize_start_width.set(sidebar_width());
            // Mouse X will be set on first mouse move
        }
    };

    // Handler: Start resizing event log (stores initial state)
    let on_resize_eventlog = move |mouse_y: i32| {
        if mouse_y < 0 {
            // Negative value signals start of resizing
            is_resizing_eventlog.set(true);
            resize_start_height.set(event_log_height());
            // Mouse Y will be set on first mouse move
        }
    };

    // Global mouse move handler for resizing
    let on_global_mouse_move = move |evt: MouseEvent| {
        let coords = evt.client_coordinates();

        if is_resizing_sidebar() {
            // Store initial mouse X if not set
            if resize_start_x() == 0.0 {
                resize_start_x.set(coords.x);
            }

            // Calculate delta from start position
            let delta_x = coords.x - resize_start_x();

            // For horizontal resize on left edge: moving left increases width, moving right decreases
            let new_width = (resize_start_width() as f64 - delta_x) as i32;
            sidebar_width.set(new_width.max(200).min(800));
        }

        if is_resizing_eventlog() {
            // Store initial mouse Y if not set
            if resize_start_y() == 0.0 {
                resize_start_y.set(coords.y);
            }

            // Calculate delta from start position
            let delta_y = coords.y - resize_start_y();

            // For vertical resize on top edge: moving up increases height, moving down decreases
            let new_height = (resize_start_height() as f64 - delta_y) as i32;
            event_log_height.set(new_height.max(100).min(600));
        }
    };

    // Global mouse up handler to stop resizing
    let on_global_mouse_up = move |_evt: MouseEvent| {
        is_resizing_sidebar.set(false);
        is_resizing_eventlog.set(false);
        // Reset start positions for next resize
        resize_start_x.set(0.0);
        resize_start_y.set(0.0);
    };

    rsx! {
        document::Link { rel: "stylesheet", href: asset!("./assets/tailwind.css") }
        style {
            dangerous_inner_html: r#"
                @keyframes spin {{
                    from {{ transform: rotate(0deg); }}
                    to {{ transform: rotate(360deg); }}
                }}
                @keyframes slideDown {{
                    from {{
                        transform: translateY(-100%);
                        opacity: 0;
                    }}
                    to {{
                        transform: translateY(0);
                        opacity: 1;
                    }}
                }}
            "#
        }

        div {
            class: "h-screen flex flex-col bg-black",
            onmousemove: on_global_mouse_move,
            onmouseup: on_global_mouse_up,

            // Topbar
            Topbar {
                is_running: is_network_running(),
                is_creating_homeserver: is_creating_homeserver(),
                is_creating_client: is_creating_client(),
                scenarios: scenarios().iter().map(|s| s.name.clone()).collect(),
                selected_scenario: selected_scenario_idx(),
                is_playing_scenario: is_playing_scenario(),
                on_toggle_network: toggle_network,
                on_add_homeserver: add_homeserver,
                on_add_client: add_client,
                on_scenario_select: on_scenario_select,
                on_play_scenario: on_play_scenario,
                on_reset: on_reset,
                on_import_scenario: move |_| {
                    notification_message.set(Some("Not implemented".to_string()));
                },
                on_export_scenario: move |_| {
                    notification_message.set(Some("Not implemented".to_string()));
                },
            }

            // Main content area
            div {
                class: "flex-1 flex overflow-hidden",

                // Network visualization (left)
                NetworkVisualization {
                    nodes: nodes(),
                    edges: edges(),
                    selected_id: selected_node_id(),
                    on_select: select_node,
                    on_node_move: move_node,
                    is_loading_scenario: is_playing_scenario() && nodes().is_empty(),
                }

                // Context sidebar (right)
                ContextSidebar {
                    selected_node: selected_node(),
                    all_nodes: nodes(),
                    event_log: event_log(),
                    is_writing: is_writing(),
                    is_reading: is_reading(),
                    sidebar_width: sidebar_width(),
                    event_log_height: event_log_height(),
                    on_stop_node: stop_node,
                    on_start_node: start_node,
                    on_remove_node: remove_node,
                    on_test_connectivity: test_connectivity,
                    on_connect_client: connect_client,
                    on_write_data: write_data,
                    on_read_data: read_data,
                    on_resize_sidebar: on_resize_sidebar,
                    on_resize_eventlog: on_resize_eventlog,
                }
            }

            // Notification popup (top center)
            if let Some(message) = notification_message() {
                div {
                    class: "fixed inset-0 z-50 flex items-start justify-center pt-16 pointer-events-none",
                    div {
                        class: "pointer-events-auto px-6 py-3 rounded-lg shadow-2xl text-sm font-medium cursor-pointer",
                        style: "background-color: #c7ff00; color: #000; animation: slideDown 0.3s ease-out;",
                        onclick: move |_| {
                            notification_message.set(None);
                        },
                        "{message}"
                    }
                }
            }
        }
    }
}
