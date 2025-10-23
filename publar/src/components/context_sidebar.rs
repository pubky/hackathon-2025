use dioxus::prelude::*;
use super::network_visualization::{Node, NodeStatus, ConnectivityStatus};

fn format_bytes(bytes: usize) -> String {
    const KB: usize = 1024;
    const MB: usize = KB * 1024;
    const GB: usize = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

#[derive(Clone, PartialEq, Debug)]
pub struct EventLogEntry {
    pub id: usize,
    pub timestamp: String,
    pub message: String,
    pub event_type: EventType,
}

#[derive(Clone, PartialEq, Debug)]
pub enum EventType {
    Success,
    Error,
    Info,
}

#[derive(Props, Clone, PartialEq)]
pub struct ContextSidebarProps {
    pub selected_node: Option<Node>,
    pub all_nodes: Vec<Node>,
    pub event_log: Vec<EventLogEntry>,
    pub is_writing: bool,
    pub is_reading: bool,
    pub sidebar_width: i32,
    pub event_log_height: i32,
    pub on_stop_node: EventHandler<String>,
    pub on_start_node: EventHandler<String>,
    pub on_remove_node: EventHandler<String>,
    pub on_test_connectivity: EventHandler<String>,
    pub on_connect_client: EventHandler<(String, String)>, // (client_id, homeserver_id)
    pub on_write_data: EventHandler<(String, String, String)>, // (client_id, path, content)
    pub on_read_data: EventHandler<(String, String)>, // (client_id, path)
    pub on_resize_sidebar: EventHandler<i32>,
    pub on_resize_eventlog: EventHandler<i32>,
}

#[component]
pub fn ContextSidebar(props: ContextSidebarProps) -> Element {
    rsx! {
        div {
            class: "bg-black border-l border-zinc-800 flex flex-col relative",
            style: "width: {props.sidebar_width}px;",

            // Horizontal resize handle (left edge)
            div {
                class: "absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-green-500/50 transition-colors z-10",
                onmousedown: move |evt| {
                    evt.stop_propagation();
                    props.on_resize_sidebar.call(-1); // Signal to start resizing (negative = start)
                },
            }

            // Top section: Node details (scrollable)
            div {
                class: "flex-1 overflow-auto p-4",

                if let Some(node) = &props.selected_node {
                    div {
                        // Header
                    div {
                        class: "mb-6 pb-4 border-b border-zinc-800",
                        h2 {
                            class: "text-base font-semibold text-white mb-1",
                            "{node.name()}"
                        }
                        p {
                            class: "text-xs text-zinc-500",
                            match node {
                                Node::Homeserver(_) => "Homeserver Details",
                                Node::Client(_) => "Client Details",
                            }
                        }
                    }

                    // Status section
                    div {
                        class: "mb-6",
                        h3 {
                            class: "text-xs font-medium text-zinc-400 mb-2",
                            "Status"
                        }
                        div {
                            class: "flex items-center gap-2",
                            div {
                                class: match node.status() {
                                    NodeStatus::Running => "w-2 h-2 rounded-full bg-green-500",
                                    NodeStatus::Starting => "w-2 h-2 rounded-full bg-yellow-500 animate-pulse",
                                    NodeStatus::Stopped => "w-2 h-2 rounded-full bg-zinc-600",
                                    NodeStatus::Error => "w-2 h-2 rounded-full bg-red-500",
                                }
                            }
                            span {
                                class: "text-sm text-zinc-300",
                                match node.status() {
                                    NodeStatus::Running => "Running",
                                    NodeStatus::Starting => "Starting...",
                                    NodeStatus::Stopped => "Stopped",
                                    NodeStatus::Error => "Error",
                                }
                            }
                        }
                    }

                    // Node-specific content
                    match node {
                        Node::Homeserver(homeserver) => rsx! {
                            // Port info
                            div {
                                class: "mb-6",
                                h3 {
                                    class: "text-xs font-medium text-zinc-400 mb-2",
                                    "Port"
                                }
                                p {
                                    class: "text-sm font-mono text-zinc-300",
                                    "{homeserver.port}"
                                }
                            }

                            // Public key
                            if let Some(public_key) = &homeserver.public_key {
                                div {
                                    class: "mb-6",
                                    h3 {
                                        class: "text-xs font-medium text-zinc-400 mb-2",
                                        "Public Key"
                                    }
                                    p {
                                        class: "text-xs font-mono text-zinc-300 break-all bg-zinc-900 p-2 rounded border border-zinc-800",
                                        "{public_key}"
                                    }
                                }
                            }

                            // Connectivity section
                            div {
                                class: "mb-6",
                                h3 {
                                    class: "text-xs font-medium text-zinc-400 mb-2",
                                    "Connectivity"
                                }
                                div {
                                    class: "flex items-center gap-2 mb-2",
                                    div {
                                        class: match &homeserver.connectivity_status {
                                            ConnectivityStatus::Connected => "w-2 h-2 rounded-full bg-green-500",
                                            ConnectivityStatus::Testing => "w-2 h-2 rounded-full bg-yellow-500 animate-pulse",
                                            ConnectivityStatus::Failed => "w-2 h-2 rounded-full bg-red-500",
                                            ConnectivityStatus::Unknown => "w-2 h-2 rounded-full bg-zinc-600",
                                        }
                                    }
                                    span {
                                        class: "text-sm text-zinc-300",
                                        match &homeserver.connectivity_status {
                                            ConnectivityStatus::Connected => "Connected",
                                            ConnectivityStatus::Testing => "Testing...",
                                            ConnectivityStatus::Failed => "Failed",
                                            ConnectivityStatus::Unknown => "Unknown",
                                        }
                                    }
                                }

                                // HTTP URL section
                                if let Some(url) = &homeserver.http_url {
                                    div {
                                        class: "mb-4",
                                        div {
                                            class: "text-xs font-medium text-zinc-400 mb-1",
                                            "HTTP URL"
                                        }
                                        div {
                                            class: "p-2 bg-zinc-900/50 rounded border border-zinc-800 font-mono text-xs text-zinc-300 break-all",
                                            "{url}"
                                        }
                                    }
                                }

                                {
                                    let homeserver_id = homeserver.id.clone();
                                    rsx! {
                                        button {
                                            class: "w-full px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-all border border-zinc-800",
                                            onclick: move |_| props.on_test_connectivity.call(homeserver_id.clone()),
                                            "Test Connectivity"
                                        }
                                    }
                                }
                            }

                            // Storage stats
                            if let Some(stats) = &homeserver.storage_stats {
                                div {
                                    class: "mb-6 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800",
                                    h3 {
                                        class: "text-xs font-medium text-zinc-400 mb-3",
                                        "Storage Statistics"
                                    }

                                    div {
                                        class: "space-y-2",
                                        div {
                                            class: "flex justify-between items-center",
                                            span {
                                                class: "text-xs text-zinc-500",
                                                "Total Keys"
                                            }
                                            span {
                                                class: "text-xs font-mono text-zinc-300",
                                                "{stats.total_keys}"
                                            }
                                        }
                                        div {
                                            class: "flex justify-between items-center",
                                            span {
                                                class: "text-xs text-zinc-500",
                                                "Total Size"
                                            }
                                            span {
                                                class: "text-xs font-mono text-zinc-300",
                                                "{format_bytes(stats.total_size_bytes)}"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        Node::Client(client) => {
                            let mut selected_homeserver = use_signal(|| Option::<String>::None);
                            let mut write_path = use_signal(|| String::from("/pub/publar/test.txt"));
                            let mut write_content = use_signal(|| String::from("Hello, Pubky!"));
                            let mut read_path = use_signal(|| String::from("/pub/publar/test.txt"));

                            // Get available homeservers
                            let homeservers: Vec<_> = props.all_nodes.iter()
                                .filter_map(|n| {
                                    if let Node::Homeserver(h) = n {
                                        Some(h)
                                    } else {
                                        None
                                    }
                                })
                                .collect();

                            rsx! {
                                // Public key
                                div {
                                    class: "mb-6",
                                    h3 {
                                        class: "text-xs font-medium text-zinc-400 mb-2",
                                        "Public Key"
                                    }
                                    p {
                                        class: "text-xs font-mono text-zinc-300 break-all bg-zinc-900 p-2 rounded border border-zinc-800",
                                        "{client.public_key}"
                                    }
                                }

                                // Connected homeserver
                                div {
                                    class: "mb-6",
                                    h3 {
                                        class: "text-xs font-medium text-zinc-400 mb-2",
                                        "Connected Homeserver"
                                    }
                                    if let Some(homeserver_id) = &client.connected_homeserver {
                                        p {
                                            class: "text-sm text-zinc-300",
                                            "{homeserver_id}"
                                        }
                                    } else {
                                        p {
                                            class: "text-sm text-zinc-500 italic",
                                            "Not connected"
                                        }
                                    }
                                }

                                // Connection controls (only show if not connected)
                                if client.connected_homeserver.is_none() && !homeservers.is_empty() {
                                    div {
                                        class: "mb-6",
                                        h3 {
                                            class: "text-xs font-medium text-zinc-400 mb-2",
                                            "Connect to Homeserver"
                                        }

                                        // Homeserver dropdown
                                        select {
                                            class: "w-full px-3 py-2 mb-2 rounded-md bg-zinc-900 text-zinc-300 text-xs border border-zinc-800 focus:outline-none focus:border-zinc-600",
                                            onchange: move |evt| {
                                                selected_homeserver.set(Some(evt.value()));
                                            },

                                            option {
                                                value: "",
                                                selected: selected_homeserver().is_none(),
                                                "Select a homeserver..."
                                            }

                                            for homeserver in homeservers.iter() {
                                                option {
                                                    value: "{homeserver.id}",
                                                    "{homeserver.name} (port {homeserver.port})"
                                                }
                                            }
                                        }

                                        // Connect button
                                        {
                                            let client_id = client.id.clone();
                                            let selected_hs = selected_homeserver();
                                            rsx! {
                                                button {
                                                    class: "w-full px-3 py-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium transition-all border border-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed",
                                                    disabled: selected_hs.is_none(),
                                                    onclick: move |_| {
                                                        if let Some(hs_id) = selected_homeserver() {
                                                            props.on_connect_client.call((client_id.clone(), hs_id));
                                                        }
                                                    },
                                                    "Connect"
                                                }
                                            }
                                        }
                                    }
                                }

                                // Read/Write controls (only show if connected)
                                if client.connected_homeserver.is_some() {
                                    div {
                                            class: "mb-6 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800",
                                            h3 {
                                                class: "text-xs font-medium text-zinc-400 mb-3",
                                                "Test Read/Write"
                                            }

                                            // Write section
                                            div {
                                                class: "mb-4",
                                                label {
                                                    class: "block text-xs text-zinc-500 mb-1",
                                                    "Write Path"
                                                }
                                                input {
                                                    class: "w-full px-2 py-1.5 mb-2 rounded-md bg-zinc-900 text-zinc-300 text-xs border border-zinc-800 focus:outline-none focus:border-zinc-600 font-mono",
                                                    r#type: "text",
                                                    value: "{write_path}",
                                                    oninput: move |evt| write_path.set(evt.value()),
                                                    placeholder: "/pub/publar/example.txt"
                                                }

                                                label {
                                                    class: "block text-xs text-zinc-500 mb-1",
                                                    "Content"
                                                }
                                                textarea {
                                                    class: "w-full px-2 py-1.5 mb-2 rounded-md bg-zinc-900 text-zinc-300 text-xs border border-zinc-800 focus:outline-none focus:border-zinc-600 font-mono",
                                                    rows: "3",
                                                    value: "{write_content}",
                                                    oninput: move |evt| write_content.set(evt.value()),
                                                    placeholder: "Enter content to write..."
                                                }

                                                {
                                                    let client_id = client.id.clone();
                                                    let path = write_path();
                                                    let content = write_content();
                                                    rsx! {
                                                        button {
                                                            class: if props.is_writing {
                                                                "w-full px-3 py-1.5 rounded-md text-xs font-medium cursor-wait flex items-center justify-center gap-2"
                                                            } else {
                                                                "w-full px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                                                            },
                                                            style: "background-color: rgba(199, 255, 0, 0.1); color: #c7ff00; border: 1px solid rgba(199, 255, 0, 0.2);",
                                                            disabled: props.is_writing,
                                                            onclick: move |_| {
                                                                props.on_write_data.call((client_id.clone(), path.clone(), content.clone()));
                                                            },
                                                            if props.is_writing {
                                                                div {
                                                                    class: "w-3 h-3 rounded-full",
                                                                    style: "border: 2px solid rgba(199, 255, 0, 0.3); border-top-color: #c7ff00; animation: spin 0.8s linear infinite;",
                                                                }
                                                            } else {
                                                                "Write Data"
                                                            }
                                                        }
                                                    }
                                                }
                                            }

                                            // Read section
                                            div {
                                                label {
                                                    class: "block text-xs text-zinc-500 mb-1",
                                                    "Read Path"
                                                }
                                                input {
                                                    class: "w-full px-2 py-1.5 mb-2 rounded-md bg-zinc-900 text-zinc-300 text-xs border border-zinc-800 focus:outline-none focus:border-zinc-600 font-mono",
                                                    r#type: "text",
                                                    value: "{read_path}",
                                                    oninput: move |evt| read_path.set(evt.value()),
                                                    placeholder: "/pub/publar/example.txt"
                                                }

                                                {
                                                    let client_id = client.id.clone();
                                                    let path = read_path();
                                                    rsx! {
                                                        button {
                                                            class: if props.is_reading {
                                                                "w-full px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 cursor-wait flex items-center justify-center gap-2"
                                                            } else {
                                                                "w-full px-3 py-1.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium transition-all border border-blue-500/20"
                                                            },
                                                            disabled: props.is_reading,
                                                            onclick: move |_| {
                                                                props.on_read_data.call((client_id.clone(), path.clone()));
                                                            },
                                                            if props.is_reading {
                                                                div {
                                                                    class: "w-3 h-3 rounded-full",
                                                                    style: "border: 2px solid rgba(96, 165, 250, 0.3); border-top-color: #60a5fa; animation: spin 0.8s linear infinite;",
                                                                }
                                                            } else {
                                                                "Read Data"
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                    }
                                }
                            }
                        }
                    }

                    // Actions
                    div {
                        class: "pt-4 border-t border-zinc-800 space-y-2",
                        {
                            let node_id = node.id().to_string();
                            rsx! {
                                button {
                                    class: "w-full px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    style: "background-color: rgba(255, 0, 0, 0.1); color: #ff0000; border: 1px solid rgba(255, 0, 0, 0.2);",
                                    onclick: move |_| props.on_remove_node.call(node_id.clone()),
                                    "Remove"
                                }
                            }
                        }
                    }
                }
            } else {
                    // Empty state
                    div {
                        class: "h-full flex items-center justify-center",
                        div {
                            class: "text-center max-w-xs",
                            div {
                                class: "w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center",
                                svg {
                                    class: "w-6 h-6 text-zinc-600",
                                    fill: "none",
                                    stroke: "currentColor",
                                    view_box: "0 0 24 24",
                                    path {
                                        stroke_linecap: "round",
                                        stroke_linejoin: "round",
                                        stroke_width: "2",
                                        d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    }
                                }
                            }
                            h3 {
                                class: "text-xs font-medium text-zinc-400 mb-1",
                                "No node selected"
                            }
                            p {
                                class: "text-xs text-zinc-600",
                                "Select a node to view details"
                            }
                        }
                    }
                }
            }

            // Bottom section: Event log (resizable height, scrollable)
            div {
                class: "border-t border-zinc-800 flex flex-col relative",
                style: "height: {props.event_log_height}px;",

                // Vertical resize handle (top edge)
                div {
                    class: "absolute left-0 right-0 top-0 h-1 cursor-ns-resize hover:bg-green-500/50 transition-colors z-10",
                    onmousedown: move |evt| {
                        evt.stop_propagation();
                        props.on_resize_eventlog.call(-1); // Signal to start resizing (negative = start)
                    },
                }

                // Header
                div {
                    class: "px-4 py-2 bg-zinc-900/50 border-b border-zinc-800",
                    h3 {
                        class: "text-xs font-medium text-zinc-400",
                        "Event Log"
                    }
                }

                // Event list (scrollable)
                div {
                    class: "flex-1 overflow-y-auto px-4 py-2",
                    if props.event_log.is_empty() {
                        div {
                            class: "h-full flex items-center justify-center",
                            p {
                                class: "text-xs text-zinc-600 italic",
                                "No events yet"
                            }
                        }
                    } else {
                        div {
                            class: "space-y-2",
                            for entry in props.event_log.iter().rev() {
                                div {
                                    key: "{entry.id}",
                                    class: "text-xs",
                                    div {
                                        class: "flex items-start gap-2",
                                        div {
                                            class: match entry.event_type {
                                                EventType::Success => "w-1.5 h-1.5 rounded-full bg-green-500 mt-1 flex-shrink-0",
                                                EventType::Error => "w-1.5 h-1.5 rounded-full bg-red-500 mt-1 flex-shrink-0",
                                                EventType::Info => "w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0",
                                            }
                                        }
                                        div {
                                            class: "flex-1",
                                            div {
                                                class: "text-zinc-500 font-mono text-[10px] mb-0.5",
                                                "{entry.timestamp}"
                                            }
                                            div {
                                                style: match entry.event_type {
                                                    EventType::Success => "color: #c7ff00;",
                                                    EventType::Error => "color: #ff0000;",
                                                    EventType::Info => "color: #60a5fa;",
                                                },
                                                "{entry.message}"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
