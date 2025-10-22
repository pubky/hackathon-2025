use std::sync::{Arc, Mutex};

use anyhow::Result;
use eframe::egui;
use pubky::{Capabilities, Pubky, PubkyAuthFlow, PubkySession};
use uuid::Uuid;

use crate::utils::generate_qr_image;

mod utils;

fn main() -> Result<(), eframe::Error> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([600.0, 700.0])
            .with_title("Pubky Desktop Login"),
        ..Default::default()
    };

    eframe::run_native(
        "Pubky Desktop Login",
        options,
        Box::new(|_cc| Ok(Box::new(PubkyApp::new()))),
    )
}

#[derive(Clone)]
enum AuthState {
    Initializing,
    ShowingQR {
        auth_url: String,
    },
    Authenticated {
        public_key: String,
        session: PubkySession,
        files: Vec<String>,
    },
    Error(String),
}

#[derive(Clone, PartialEq)]
enum ViewState {
    Main,
    CreateWiki,
}

struct PubkyApp {
    state: Arc<Mutex<AuthState>>,
    qr_texture: Option<egui::TextureHandle>,
    view_state: ViewState,
    wiki_content: String,
}

impl PubkyApp {
    fn new() -> Self {
        let state = Arc::new(Mutex::new(AuthState::Initializing));

        // Start the auth flow in a background task
        let state_clone = state.clone();
        std::thread::spawn(move || {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                match initialize_auth().await {
                    Ok((flow, auth_url)) => {
                        *state_clone.lock().unwrap() = AuthState::ShowingQR {
                            auth_url: auth_url.clone(),
                        };

                        // Poll for authentication
                        match flow.await_approval().await {
                            Ok(session) => {
                                let pk = session.info().public_key().to_string();

                                // List files from the homeserver
                                let mut files = Vec::new();
                                match session.storage().list("/pub/").unwrap().send().await {
                                    Ok(entries) => {
                                        println!("Files on homeserver:");
                                        for entry in &entries {
                                            let path = entry.to_pubky_url();
                                            println!("  {}", path);
                                            files.push(path);
                                        }
                                    }
                                    Err(e) => {
                                        println!("Failed to list files: {}", e);
                                    }
                                }

                                *state_clone.lock().unwrap() = AuthState::Authenticated {
                                    public_key: pk,
                                    session,
                                    files,
                                };
                            }
                            Err(e) => {
                                *state_clone.lock().unwrap() =
                                    AuthState::Error(format!("Authentication failed: {}", e));
                            }
                        }
                    }
                    Err(e) => {
                        *state_clone.lock().unwrap() =
                            AuthState::Error(format!("Failed to initialize: {}", e));
                    }
                }
            });
        });

        Self {
            state,
            qr_texture: None,
            view_state: ViewState::Main,
            wiki_content: String::new(),
        }
    }
}

impl eframe::App for PubkyApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Request repaint to keep UI responsive
        ctx.request_repaint();

        egui::CentralPanel::default().show(ctx, |ui| {
            ui.vertical_centered(|ui| {
                ui.add_space(20.0);
                ui.heading("Pubky Desktop Login");
                ui.add_space(20.0);

                let state = self.state.lock().unwrap().clone();

                match state {
                    AuthState::Initializing => {
                        ui.spinner();
                        ui.label("Initializing authentication...");
                    }
                    AuthState::ShowingQR { ref auth_url } => {
                        ui.label("Scan this QR code with your Pubky app to login:");
                        ui.add_space(20.0);

                        // Generate and display QR code
                        if self.qr_texture.is_none() {
                            if let Some(qr_image) = generate_qr_image(auth_url) {
                                self.qr_texture = Some(ui.ctx().load_texture(
                                    "qr_code",
                                    qr_image,
                                    Default::default(),
                                ));
                            }
                        }

                        if let Some(texture) = &self.qr_texture {
                            // Constrain QR code size to fit within window
                            let max_size = egui::vec2(300.0, 300.0);
                            ui.add(egui::Image::from_texture(texture).max_size(max_size));
                        }

                        ui.add_space(20.0);
                        ui.label("Or use this URL:");
                        ui.add_space(5.0);

                        // Display URL in a scrollable area
                        egui::ScrollArea::vertical()
                            .max_height(100.0)
                            .show(ui, |ui| {
                                ui.add(
                                    egui::TextEdit::multiline(&mut auth_url.as_str())
                                        .desired_width(f32::INFINITY)
                                        .interactive(true),
                                );
                            });

                        ui.add_space(10.0);
                        ui.label("Waiting for authentication...");
                        ui.spinner();
                    }
                    AuthState::Authenticated {
                        ref public_key,
                        ref session,
                        files: _,
                    } => {
                        // Show different views based on view_state
                        match self.view_state {
                            ViewState::Main => {
                                ui.label("✓ Authentication Successful!");
                                ui.add_space(20.0);
                                ui.label("Your Public Key:");
                                ui.add_space(10.0);

                                // Display public key in a scrollable text area
                                egui::Frame::new()
                                    .fill(egui::Color32::from_gray(240))
                                    .inner_margin(10.0)
                                    .show(ui, |ui| {
                                        ui.add(
                                            egui::TextEdit::multiline(&mut public_key.as_str())
                                                .desired_width(f32::INFINITY)
                                                .font(egui::TextStyle::Monospace),
                                        );
                                    });

                                ui.add_space(20.0);

                                // Create new wiki page button
                                if ui.button("Create new wiki page").clicked() {
                                    self.view_state = ViewState::CreateWiki;
                                }
                            }
                            ViewState::CreateWiki => {
                                ui.label("Create New Wiki Page");
                                ui.add_space(20.0);

                                // Textarea for wiki content
                                ui.label("Content:");
                                ui.add_space(10.0);

                                egui::ScrollArea::vertical()
                                    .max_height(400.0)
                                    .show(ui, |ui| {
                                        ui.add(
                                            egui::TextEdit::multiline(&mut self.wiki_content)
                                                .desired_width(f32::INFINITY)
                                                .desired_rows(15),
                                        );
                                    });

                                ui.add_space(20.0);

                                // Save and Cancel buttons
                                ui.horizontal(|ui| {
                                    if ui.button("Save wiki").clicked() {
                                        let session_clone = session.clone();
                                        let content = self.wiki_content.clone();
                                        std::thread::spawn(move || {
                                            let rt = tokio::runtime::Runtime::new().unwrap();
                                            rt.block_on(async {
                                                match create_wiki_post(&session_clone, &content)
                                                    .await
                                                {
                                                    Ok(path) => {
                                                        println!("Created wiki post at: {}", path);
                                                    }
                                                    Err(e) => {
                                                        println!(
                                                            "Failed to create wiki post: {}",
                                                            e
                                                        );
                                                    }
                                                }
                                            });
                                        });
                                        self.wiki_content.clear();
                                        self.view_state = ViewState::Main;
                                    }

                                    if ui.button("Cancel").clicked() {
                                        self.wiki_content.clear();
                                        self.view_state = ViewState::Main;
                                    }
                                });
                            }
                        }
                    }
                    AuthState::Error(ref error) => {
                        ui.colored_label(egui::Color32::RED, "Error");
                        ui.add_space(10.0);
                        ui.label(error);
                    }
                }
            });
        });
    }
}

async fn initialize_auth() -> Result<(PubkyAuthFlow, String)> {
    let pubky = Pubky::new()?;
    let caps = Capabilities::builder().write("/pub/wiki.app/").finish();
    let flow = pubky.start_auth_flow(&caps)?;
    let auth_url = flow.authorization_url().to_string();

    Ok((flow, auth_url))
}

async fn create_wiki_post(session: &PubkySession, content: &str) -> Result<String> {
    let path = format!("/pub/wiki.app/{}", Uuid::new_v4());

    // Create the post with the provided content
    session.storage().put(&path, content.to_string()).await?;

    println!("Created post at path: {}", path);

    Ok(path)
}
