use std::sync::{Arc, Mutex};

use anyhow::{anyhow, Result};
use eframe::egui;
use egui_commonmark::*;
use pubky::{Capabilities, Pubky, PubkyAuthFlow, PubkySession, PublicStorage};
use tokio::runtime::Runtime;
use uuid::Uuid;

use crate::utils::generate_qr_image;

mod edit_wiki;
mod utils;
mod view_wiki;

const APP_NAME: &str = "Pubky Wiki";

fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let rt = Runtime::new()?;
    let app = PubkyApp::new(rt);

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([600.0, 700.0])
            .with_title(APP_NAME),
        ..Default::default()
    };

    eframe::run_native(APP_NAME, options, Box::new(|_cc| Ok(Box::new(app))))
        .map_err(|e| anyhow!("{e}"))
}

#[derive(Clone)]
pub(crate) enum AuthState {
    Initializing,
    ShowingQR {
        auth_url: String,
    },
    Authenticated {
        session: PubkySession,
        public_storage: PublicStorage,
        files: Vec<String>,
    },
    Error(String),
}

#[derive(Clone, PartialEq)]
pub(crate) enum ViewState {
    WikiList,
    CreateWiki,
    ViewWiki,
}

pub(crate) struct PubkyApp {
    pub(crate) state: Arc<Mutex<AuthState>>,
    qr_texture: Option<egui::TextureHandle>,
    pub(crate) view_state: ViewState,
    pub(crate) wiki_content: String,
    pub(crate) selected_wiki_page_id: String,
    pub(crate) selected_wiki_content: String,
    pub(crate) selected_wiki_user_id: String,
    pub(crate) needs_refresh: bool,
    cache: CommonMarkCache,
    rt: Arc<Runtime>,
}

impl PubkyApp {
    fn new(rt: Runtime) -> Self {
        let state = Arc::new(Mutex::new(AuthState::Initializing));

        // Start the auth flow in a background task
        let state_clone = state.clone();

        let rt_arc = Arc::new(rt);
        let rt_arc_clone = rt_arc.clone();
        std::thread::spawn(move || {
            let initialize_auth_fut = initialize_auth();
            match rt_arc_clone.block_on(initialize_auth_fut) {
                Ok((pubky, flow, auth_url)) => {
                    *state_clone.lock().unwrap() = AuthState::ShowingQR {
                        auth_url: auth_url.clone(),
                    };

                    // Poll for authentication
                    let await_approval_fut = flow.await_approval();
                    match rt_arc_clone.block_on(await_approval_fut) {
                        Ok(session) => {
                            let session_storage = session.storage();
                            let mut files = Vec::new();

                            // List files from the homeserver
                            let session_storage_list_fut =
                                session_storage.list("/pub/wiki.app/").unwrap().send();
                            match rt_arc_clone.block_on(session_storage_list_fut) {
                                Ok(entries) => {
                                    for entry in &entries {
                                        let path = entry.to_pubky_url();
                                        files.push(path);
                                    }
                                }
                                Err(e) => log::error!("Failed to list files: {e}",),
                            }

                            *state_clone.lock().unwrap() = AuthState::Authenticated {
                                session,
                                public_storage: pubky.public_storage(),
                                files,
                            };
                        }
                        Err(e) => {
                            *state_clone.lock().unwrap() =
                                AuthState::Error(format!("Authentication failed: {e}"));
                        }
                    }
                }
                Err(e) => {
                    *state_clone.lock().unwrap() =
                        AuthState::Error(format!("Failed to initialize: {e}"));
                }
            }
        });

        Self {
            state,
            qr_texture: None,
            view_state: ViewState::WikiList,
            wiki_content: String::new(),
            selected_wiki_page_id: String::new(),
            selected_wiki_content: String::new(),
            selected_wiki_user_id: String::new(),
            needs_refresh: false,
            cache: CommonMarkCache::default(),
            rt: rt_arc,
        }
    }

    fn navigate_to_wiki_page(&mut self, user_pk: &str, page_id: &str) {
        self.selected_wiki_user_id = user_pk.to_string();
        self.selected_wiki_page_id = page_id.to_string();
        self.selected_wiki_content = String::new();
        self.view_state = ViewState::ViewWiki;
    }
}

impl eframe::App for PubkyApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Request repaint to keep UI responsive
        ctx.request_repaint();

        egui::CentralPanel::default().show(ctx, |ui| {
            ui.vertical_centered(|ui| {
                ui.add_space(20.0);
                ui.heading(APP_NAME);
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

                        ui.add_space(10.0);
                        ui.label("Waiting for authentication...");
                        ui.spinner();
                    }
                    AuthState::Authenticated {
                        ref session,
                        ref public_storage,
                        ref files,
                    } => {
                        // Check if we need to refresh the files list
                        if self.needs_refresh {
                            let session_storage = session.storage();
                            let state_clone = self.state.clone();
                            let mut new_files = Vec::new();

                            let session_list_fut =
                                session_storage.list("/pub/wiki.app/").unwrap().send();
                            match self.rt.block_on(session_list_fut) {
                                Ok(entries) => {
                                    for entry in &entries {
                                        let path = entry.to_pubky_url();
                                        new_files.push(path);
                                    }
                                }
                                Err(e) => log::error!("Failed to refresh files: {e}"),
                            }

                            // Update the state with new files
                            if let Ok(mut state) = state_clone.lock() {
                                if let AuthState::Authenticated { ref mut files, .. } = *state {
                                    *files = new_files;
                                }
                            }

                            self.needs_refresh = false;
                        }

                        // Show different views based on view_state
                        match self.view_state {
                            ViewState::WikiList => {
                                ui.label("My Wiki Posts");
                                ui.add_space(20.0);

                                // Create new wiki page button
                                if ui.button("Create new wiki page").clicked() {
                                    self.view_state = ViewState::CreateWiki;
                                }

                                ui.add_space(20.0);

                                // List all wiki posts as buttons
                                egui::ScrollArea::vertical().show(ui, |ui| {
                                    if files.is_empty() {
                                        ui.label("No wiki posts yet. Create your first one!");
                                    } else {
                                        for file_url in files {
                                            // Extract just the filename from the URL
                                            let file_name =
                                                file_url.split('/').last().unwrap_or(file_url);

                                            if ui.button(file_name).clicked() {
                                                let own_pk =
                                                    session.info().public_key().to_string();
                                                self.navigate_to_wiki_page(&own_pk, file_name);
                                            }
                                        }
                                    }
                                });
                            }
                            ViewState::CreateWiki => edit_wiki::update(self, session, ctx, ui),
                            ViewState::ViewWiki => view_wiki::update(self, public_storage, ctx, ui),
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

async fn initialize_auth() -> Result<(Pubky, PubkyAuthFlow, String)> {
    let pubky = Pubky::new()?;
    let caps = Capabilities::builder().write("/pub/wiki.app/").finish();
    let flow = pubky.start_auth_flow(&caps)?;
    let auth_url = flow.authorization_url().to_string();

    Ok((pubky, flow, auth_url))
}

pub(crate) async fn create_wiki_post(session: &PubkySession, content: &str) -> Result<String> {
    let path = format!("/pub/wiki.app/{}", Uuid::new_v4());

    // Create the post with the provided content
    session.storage().put(&path, content.to_string()).await?;

    log::info!("Created post at path: {}", path);

    Ok(path)
}
