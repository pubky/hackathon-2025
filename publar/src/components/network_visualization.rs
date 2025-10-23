use dioxus::prelude::*;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsCast;

// Convert client coordinates to SVG user units using the CTM
#[cfg(target_arch = "wasm32")]
fn client_to_svg(el: &web_sys::SvgGraphicsElement, client_x: f64, client_y: f64) -> (f64, f64) {
    // CTM maps SVG user units -> CSS pixels. We need its inverse.
    let ctm = el.get_screen_ctm().expect("ctm").inverse().expect("inv");
    // DOMPoint is convenient for matrix multiplication
    let point = web_sys::DomPoint::new_with_x_and_y(client_x, client_y);
    let p = ctm.multiply_point(&point);
    (p.x(), p.y())
}

// Get mouse position in SVG user units
#[cfg(target_arch = "wasm32")]
macro_rules! mouse_svg {
    ($g:expr, $evt:expr) => {{
        if let Some(g) = $g.read().as_ref() {
            let coords = $evt.client_coordinates();
            client_to_svg(g, coords.x, coords.y)
        } else {
            let coords = $evt.client_coordinates();
            (coords.x, coords.y)
        }
    }};
}

#[cfg(not(target_arch = "wasm32"))]
macro_rules! mouse_svg {
    ($g:expr, $evt:expr) => {{
        let coords = $evt.client_coordinates();
        (coords.x, coords.y)
    }};
}

#[derive(Clone, PartialEq, Debug)]
pub enum Node {
    Homeserver(Homeserver),
    Client(Client),
}

impl Node {
    pub fn id(&self) -> &str {
        match self {
            Node::Homeserver(h) => &h.id,
            Node::Client(c) => &c.id,
        }
    }

    pub fn name(&self) -> &str {
        match self {
            Node::Homeserver(h) => &h.name,
            Node::Client(c) => &c.name,
        }
    }

    pub fn status(&self) -> &NodeStatus {
        match self {
            Node::Homeserver(h) => &h.status,
            Node::Client(c) => &c.status,
        }
    }

    #[allow(dead_code)]
    pub fn public_key(&self) -> Option<&str> {
        match self {
            Node::Homeserver(h) => h.public_key.as_deref(),
            Node::Client(c) => Some(&c.public_key),
        }
    }

    pub fn position(&self) -> (f64, f64) {
        match self {
            Node::Homeserver(h) => (h.x, h.y),
            Node::Client(c) => (c.x, c.y),
        }
    }

    pub fn set_position(&mut self, x: f64, y: f64) {
        match self {
            Node::Homeserver(h) => {
                h.x = x;
                h.y = y;
            }
            Node::Client(c) => {
                c.x = x;
                c.y = y;
            }
        }
    }
}

#[derive(Clone, PartialEq, Debug)]
pub struct Homeserver {
    pub id: String,
    pub name: String,
    pub port: u16,
    pub http_url: Option<String>,
    pub status: NodeStatus,
    pub public_key: Option<String>,
    pub connectivity_status: ConnectivityStatus,
    pub storage_stats: Option<StorageStats>,
    pub x: f64,
    pub y: f64,
}

#[derive(Clone, Debug)]
pub struct Client {
    pub id: String,
    pub name: String,
    pub public_key: String,
    pub status: NodeStatus,
    pub connected_homeserver: Option<String>,
    pub x: f64,
    pub y: f64,
}

// Manual PartialEq implementation (keypair can't be compared)
impl PartialEq for Client {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id
            && self.name == other.name
            && self.public_key == other.public_key
            && self.status == other.status
            && self.connected_homeserver == other.connected_homeserver
            && self.x == other.x
            && self.y == other.y
    }
}

#[derive(Clone, PartialEq, Debug)]
pub struct Edge {
    pub from: String, // node id
    pub to: String,   // node id
    pub edge_type: EdgeType,
}

#[derive(Clone, PartialEq, Debug)]
#[allow(dead_code)]
pub enum EdgeType {
    Connection, // Client connected to Homeserver
}

#[derive(Clone, PartialEq, Debug)]
#[allow(dead_code)]
pub enum ConnectivityStatus {
    Unknown,
    Testing,
    Connected,
    Failed,
}

#[derive(Clone, PartialEq, Debug)]
pub struct StorageStats {
    pub total_keys: usize,
    pub total_size_bytes: usize,
}

#[derive(Clone, PartialEq, Debug)]
#[allow(dead_code)]
pub enum NodeStatus {
    Starting,
    Running,
    Stopped,
    Error,
}

#[derive(Props, Clone, PartialEq)]
pub struct NetworkVisualizationProps {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
    pub selected_id: Option<String>,
    pub on_select: EventHandler<String>,
    pub on_node_move: EventHandler<(String, f64, f64)>,
    pub is_loading_scenario: bool,
}

#[component]
pub fn NetworkVisualization(props: NetworkVisualizationProps) -> Element {
    // Store: (node_id, offset_x, offset_y) - offset from mouse to node center in SVG coords
    let mut dragging = use_signal(|| Option::<(String, f64, f64)>::None);
    let mut panning = use_signal(|| Option::<(f64, f64)>::None);
    let mut pan_offset = use_signal(|| (0.0, 0.0));
    let mut zoom = use_signal(|| 1.0);

    // Reference to the transformed <g> element for coordinate conversion
    #[cfg(target_arch = "wasm32")]
    let viewport_g = use_signal(|| Option::<web_sys::SvgGraphicsElement>::None);

    #[cfg(not(target_arch = "wasm32"))]
    let _viewport_g = use_signal(|| Option::<()>::None);

    let on_mouse_move = {
        let on_node_move = props.on_node_move.clone();

        move |evt: MouseEvent| {
            let (sx, sy) = mouse_svg!(viewport_g, evt);
            let (cur_pan_x, cur_pan_y) = pan_offset();

            // Handle panning: deltas in SVG units
            if let Some((start_x, start_y)) = panning() {
                let dx = sx - start_x;
                let dy = sy - start_y;
                pan_offset.set((cur_pan_x + dx, cur_pan_y + dy));
                panning.set(Some((sx, sy))); // advance in SVG units
                return;
            }

            // Handle node dragging: all in SVG units
            if let Some((ref node_id, offset_x, offset_y)) = dragging() {
                let new_svg_x = sx + offset_x;
                let new_svg_y = sy + offset_y;
                on_node_move.call((node_id.clone(), new_svg_x, new_svg_y));
            }
        }
    };

    let on_mouse_up = move |_evt: MouseEvent| {
        dragging.set(None);
        panning.set(None);
    };

    let on_wheel = move |evt: WheelEvent| {
        evt.prevent_default();

        // Get mouse position in SVG user units
        let (px_svg, py_svg) = mouse_svg!(viewport_g, evt);

        let (pan_x, pan_y) = pan_offset();
        let z = zoom();

        let delta = evt.delta();
        let zoom_factor = if delta.strip_units().y < 0.0 { 1.1_f64 } else { 0.9_f64 };
        let z_new = (z * zoom_factor).max(0.1_f64).min(5.0_f64);

        // Keep pivot stable: pan' = pan + (z - z_new) * pivot_svg
        let pan_x_new = pan_x + (z - z_new) * px_svg;
        let pan_y_new = pan_y + (z - z_new) * py_svg;

        zoom.set(z_new);
        pan_offset.set((pan_x_new, pan_y_new));
    };

    let on_canvas_mouse_down = move |evt: MouseEvent| {
        // Start panning with middle mouse button
        let buttons = evt.held_buttons();
        if buttons.contains(dioxus::html::input_data::MouseButton::Auxiliary) {
            let (sx, sy) = mouse_svg!(viewport_g, evt);
            panning.set(Some((sx, sy))); // SVG units
        }
    };

    let (pan_x, pan_y) = pan_offset();
    let current_zoom = zoom();
    let transform = format!("translate({} {}) scale({})", pan_x, pan_y, current_zoom);

    rsx! {
        div {
            class: "flex-1 bg-black relative overflow-hidden select-none",
            style: "user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; cursor: default; will-change: transform;",
            onmousemove: on_mouse_move,
            onmouseup: on_mouse_up,
            onmousedown: on_canvas_mouse_down,
            onwheel: on_wheel,

            if props.nodes.is_empty() {
                // Empty state
                div {
                    class: "absolute inset-0 flex items-center justify-center pointer-events-none",
                    div {
                        class: "text-center max-w-md",
                        if props.is_loading_scenario {
                            // Loading spinner with pulsing animation
                            div {
                                class: "w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center",
                                style: "border: 3px solid #18181b; border-top-color: #c7ff00; animation: spin 1s linear infinite;",
                            }
                            h3 {
                                class: "text-sm font-medium mb-1",
                                style: "color: #c7ff00;",
                                "Loading scenario..."
                            }
                            p {
                                class: "text-xs text-zinc-600",
                                "Setting up network topology"
                            }
                        } else {
                            div {
                                class: "w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center",
                                svg {
                                    class: "w-8 h-8 text-zinc-600",
                                    fill: "none",
                                    stroke: "currentColor",
                                    view_box: "0 0 24 24",
                                    path {
                                        stroke_linecap: "round",
                                        stroke_linejoin: "round",
                                        stroke_width: "2",
                                        d: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                                    }
                                }
                            }
                            h3 {
                                class: "text-sm font-medium text-zinc-400 mb-1",
                                "No nodes in network"
                            }
                            p {
                                class: "text-xs text-zinc-600",
                                "Add homeservers or clients to visualize the network"
                            }
                        }
                    }
                }
            } else {
                // SVG Canvas
                svg {
                    class: "w-full h-full",
                    view_box: "0 0 1200 800",
                    style: "shape-rendering: geometricPrecision;",

                    // Add a rect to catch mouse events and prevent artifacts
                    rect {
                        x: "0",
                        y: "0",
                        width: "1200",
                        height: "800",
                        fill: "transparent",
                        pointer_events: "all"
                    }

                    // Group with transform for zoom and pan
                    g {
                        transform: "{transform}",
                        style: "will-change: transform;",
                        onmounted: move |_evt| {
                            #[cfg(target_arch = "wasm32")]
                            if let Ok(ge) = _evt.data().dyn_into::<web_sys::SvgGraphicsElement>() {
                                viewport_g.set(Some(ge));
                            }
                        },

                        // Draw edges first (so they appear behind nodes)
                        for edge in props.edges.iter() {
                        {
                            let from_node = props.nodes.iter().find(|n| n.id() == edge.from);
                            let to_node = props.nodes.iter().find(|n| n.id() == edge.to);

                            if let (Some(from), Some(to)) = (from_node, to_node) {
                                let (x1, y1) = from.position();
                                let (x2, y2) = to.position();

                                rsx! {
                                    line {
                                        key: "{edge.from}-{edge.to}",
                                        x1: "{x1}",
                                        y1: "{y1}",
                                        x2: "{x2}",
                                        y2: "{y2}",
                                        stroke: "#c7ff00",
                                        stroke_width: "3",
                                        opacity: "0.6"
                                    }
                                }
                            } else {
                                rsx! { line {} }
                            }
                        }
                    }

                    // Draw nodes
                    for node in props.nodes.iter() {
                        {
                            let node_id_str = node.id();
                            let is_selected = props.selected_id.as_ref().map(|s| s.as_str()) == Some(node_id_str);
                            let node_id = node_id_str.to_string();
                            let node_id_for_drag = node_id.clone();
                            let node_id_for_select = node_id.clone();
                            let (x, y) = node.position();

                            let (fill_color, stroke_color) = match node.status() {
                                NodeStatus::Running => ("#18181b", "#c7ff00"),
                                NodeStatus::Starting => ("#18181b", "#eab308"),
                                NodeStatus::Stopped => ("#18181b", "#52525b"),
                                NodeStatus::Error => ("#18181b", "#ef4444"),
                            };

                            let stroke_width = if is_selected { "3" } else { "2" };

                            rsx! {
                                g {
                                    key: "{node.id()}",
                                    cursor: "pointer",
                                    onclick: move |_| props.on_select.call(node_id.clone()),

                                    // Node circle
                                    circle {
                                        cx: "{x}",
                                        cy: "{y}",
                                        r: "30",
                                        fill: fill_color,
                                        stroke: stroke_color,
                                        stroke_width: stroke_width,
                                        onmousedown: move |evt| {
                                            // Select the node when starting to drag
                                            props.on_select.call(node_id_for_select.clone());

                                            // Compute everything in SVG units
                                            let (mx_svg, my_svg) = mouse_svg!(viewport_g, evt);

                                            // Offset in SVG units
                                            let offset_x = x - mx_svg;
                                            let offset_y = y - my_svg;

                                            dragging.set(Some((node_id_for_drag.clone(), offset_x, offset_y)));
                                        },
                                    }

                                    // Node icon
                                    match node {
                                        Node::Homeserver(_) => rsx! {
                                            // Server icon
                                            rect {
                                                x: "{x - 10.0}",
                                                y: "{y - 8.0}",
                                                width: "20",
                                                height: "6",
                                                fill: "#a1a1aa",
                                                rx: "1"
                                            }
                                            rect {
                                                x: "{x - 10.0}",
                                                y: "{y + 2.0}",
                                                width: "20",
                                                height: "6",
                                                fill: "#a1a1aa",
                                                rx: "1"
                                            }
                                            circle {
                                                cx: "{x + 7.0}",
                                                cy: "{y - 5.0}",
                                                r: "1.5",
                                                fill: "#c7ff00"
                                            }
                                        },
                                        Node::Client(_) => rsx! {
                                            // User icon
                                            circle {
                                                cx: "{x}",
                                                cy: "{y - 6.0}",
                                                r: "6",
                                                fill: "none",
                                                stroke: "#a1a1aa",
                                                stroke_width: "2"
                                            }
                                            path {
                                                d: "M {x - 10.0} {y + 10.0} Q {x} {y} {x + 10.0} {y + 10.0}",
                                                fill: "none",
                                                stroke: "#a1a1aa",
                                                stroke_width: "2",
                                                stroke_linecap: "round"
                                            }
                                        }
                                    }

                                    // Node label
                                    text {
                                        x: "{x}",
                                        y: "{y + 45.0}",
                                        text_anchor: "middle",
                                        fill: "#a1a1aa",
                                        font_size: "12",
                                        font_family: "system-ui, -apple-system, sans-serif",
                                        pointer_events: "none",
                                        style: "user-select: none; -webkit-user-select: none;",
                                        "{node.name()}"
                                    }
                                }
                            }
                        }
                    }
                    }
                }
            }

            // Zoom controls overlay
            div {
                class: "absolute bottom-4 right-4 flex flex-col gap-2",

                button {
                    class: "w-10 h-10 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 flex items-center justify-center transition-all",
                    onclick: move |_| {
                        let new_zoom = (zoom() * 1.2).min(5.0);
                        zoom.set(new_zoom);
                    },
                    "+"
                }

                div {
                    class: "w-10 h-10 rounded-md bg-zinc-900 text-white border border-zinc-800 flex items-center justify-center text-xs",
                    "{(current_zoom * 100.0) as i32}%"
                }

                button {
                    class: "w-10 h-10 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 flex items-center justify-center transition-all",
                    onclick: move |_| {
                        let new_zoom = (zoom() / 1.2).max(0.1);
                        zoom.set(new_zoom);
                    },
                    "−"
                }

                button {
                    class: "w-10 h-10 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 flex items-center justify-center transition-all text-xs",
                    onclick: move |_| {
                        zoom.set(1.0);
                        pan_offset.set((0.0, 0.0));
                    },
                    "Reset"
                }
            }

            // Instructions overlay
            div {
                class: "absolute top-4 left-4 bg-zinc-900/90 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-400",
                div { "Scroll to zoom" }
                div { "Middle-click + drag to pan" }
                div { "Drag nodes to move" }
            }
        }
    }
}
