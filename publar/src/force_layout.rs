/// Force-directed graph layout algorithm
/// Based on Fruchterman-Reingold algorithm, similar to D3's force simulation

use crate::components::network_visualization::Node;

const REPULSION_STRENGTH: f64 = 5000.0; // Repulsion between nodes
const ATTRACTION_STRENGTH: f64 = 0.05; // Attraction along edges
const DAMPING: f64 = 0.85; // Velocity damping (0-1)
const MIN_DISTANCE: f64 = 50.0; // Minimum distance between nodes
const IDEAL_EDGE_LENGTH: f64 = 150.0; // Target distance for connected nodes

#[derive(Clone, Debug)]
pub struct ForceNode {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub vx: f64, // Velocity X
    pub vy: f64, // Velocity Y
}

pub struct ForceLayout {
    pub nodes: Vec<ForceNode>,
    pub edges: Vec<(String, String)>, // (from_id, to_id)
}

impl ForceLayout {
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self {
            nodes: Vec::new(),
            edges: Vec::new(),
        }
    }

    /// Initialize from existing nodes
    pub fn from_nodes(nodes: &[Node], edges: &[(String, String)]) -> Self {
        let force_nodes = nodes
            .iter()
            .map(|node| {
                let (x, y) = node.position();
                ForceNode {
                    id: node.id().to_string(),
                    x,
                    y,
                    vx: 0.0,
                    vy: 0.0,
                }
            })
            .collect();

        Self {
            nodes: force_nodes,
            edges: edges.to_vec(),
        }
    }

    /// Run one iteration of the force simulation
    pub fn tick(&mut self) {
        // Calculate repulsion forces (all nodes repel each other)
        for i in 0..self.nodes.len() {
            for j in (i + 1)..self.nodes.len() {
                let dx = self.nodes[j].x - self.nodes[i].x;
                let dy = self.nodes[j].y - self.nodes[i].y;
                let distance = (dx * dx + dy * dy).sqrt().max(MIN_DISTANCE);

                // Repulsion force: F = k^2 / distance
                let force = REPULSION_STRENGTH / (distance * distance);
                let fx = (dx / distance) * force;
                let fy = (dy / distance) * force;

                self.nodes[i].vx -= fx;
                self.nodes[i].vy -= fy;
                self.nodes[j].vx += fx;
                self.nodes[j].vy += fy;
            }
        }

        // Calculate attraction forces (connected nodes attract each other)
        // Uses spring force: pulls nodes together if too far, pushes apart if too close
        for (from_id, to_id) in &self.edges {
            if let (Some(from_idx), Some(to_idx)) = (
                self.nodes.iter().position(|n| &n.id == from_id),
                self.nodes.iter().position(|n| &n.id == to_id),
            ) {
                let dx = self.nodes[to_idx].x - self.nodes[from_idx].x;
                let dy = self.nodes[to_idx].y - self.nodes[from_idx].y;
                let distance = (dx * dx + dy * dy).sqrt().max(1.0); // Avoid division by zero

                // Spring force: F = (distance - ideal_length) * k
                // This creates attraction if too far, repulsion if too close
                let displacement = distance - IDEAL_EDGE_LENGTH;
                let force = displacement * ATTRACTION_STRENGTH;
                let fx = (dx / distance) * force;
                let fy = (dy / distance) * force;

                self.nodes[from_idx].vx += fx;
                self.nodes[from_idx].vy += fy;
                self.nodes[to_idx].vx -= fx;
                self.nodes[to_idx].vy -= fy;
            }
        }

        // Apply velocity with damping and update positions
        for node in &mut self.nodes {
            node.vx *= DAMPING;
            node.vy *= DAMPING;
            node.x += node.vx;
            node.y += node.vy;

            // Keep nodes within reasonable bounds
            node.x = node.x.max(100.0).min(1100.0);
            node.y = node.y.max(100.0).min(700.0);
        }
    }

    /// Run multiple iterations to stabilize the layout
    #[allow(dead_code)]
    pub fn run(&mut self, iterations: usize) {
        for _ in 0..iterations {
            self.tick();
        }
    }

    /// Get the final positions
    pub fn get_positions(&self) -> Vec<(String, f64, f64)> {
        self.nodes
            .iter()
            .map(|node| (node.id.clone(), node.x, node.y))
            .collect()
    }
}

/// Calculate initial position for a new node using force-directed principles
/// This provides a good starting position before the layout algorithm runs
pub fn calculate_initial_position(
    existing_nodes: &[Node],
    connected_to: Option<&str>,
) -> (f64, f64) {
    // If connected to a specific node, position near it
    if let Some(target_id) = connected_to {
        if let Some(target) = existing_nodes.iter().find(|n| n.id() == target_id) {
            let (tx, ty) = target.position();
            // Position at a random angle around the target node
            let angle = (existing_nodes.len() as f64) * 1.3; // Pseudo-random angle
            let distance = 150.0; // Distance from target
            return (tx + distance * angle.cos(), ty + distance * angle.sin());
        }
    }

    // Default: position near the center with some randomness
    let count = existing_nodes.len();
    let angle = (count as f64) * 2.4; // Pseudo-random angle
    let radius = 100.0 + (count as f64 * 30.0).min(200.0);
    (
        600.0 + radius * angle.cos(),
        400.0 + radius * angle.sin(),
    )
}
