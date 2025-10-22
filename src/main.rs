use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use anyhow::{anyhow, Result};
use eframe::egui;
use egui_commonmark::*;
use pubky::{Capabilities, Pubky, PubkyAuthFlow, PubkySession, PublicStorage};
use tokio::runtime::Runtime;
use uuid::Uuid;

use crate::utils::{extract_title, generate_qr_image};

mod create_wiki;
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
        pub_storage: PublicStorage,
        /// Map file URL to file title
        file_cache: HashMap<String, String>,
    },
    Error(String),
}

#[derive(Clone, PartialEq)]
pub(crate) enum ViewState {
    WikiList,
    CreateWiki,
    ViewWiki,
    EditWiki,
}

pub(crate) struct PubkyApp {
    pub(crate) state: Arc<Mutex<AuthState>>,
    qr_texture: Option<egui::TextureHandle>,
    pub(crate) view_state: ViewState,
    /// Content for the Edit Wiki view
    pub(crate) edit_wiki_content: String,
    pub(crate) selected_wiki_page_id: String,
    pub(crate) selected_wiki_content: String,
    pub(crate) selected_wiki_user_id: String,
    pub(crate) needs_refresh: bool,
    cache: CommonMarkCache,
    rt: Arc<Runtime>,
    pub(crate) show_copy_tooltip: bool,
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
                            Self::fetch_files_and_update(
                                &session,
                                &pubky.public_storage(),
                                rt_arc_clone,
                                state_clone,
                            );
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
            edit_wiki_content: String::new(),
            selected_wiki_page_id: String::new(),
            selected_wiki_content: String::new(),
            selected_wiki_user_id: String::new(),
            needs_refresh: false,
            cache: CommonMarkCache::default(),
            rt: rt_arc,
            show_copy_tooltip: false,
        }
    }

    /// Fetch the list of files and their titles, then update the state with the file cache
    fn fetch_files_and_update(
        session: &PubkySession,
        pub_storage: &PublicStorage,
        rt_arc_clone: Arc<Runtime>,
        state_clone: Arc<Mutex<AuthState>>,
    ) {
        let session_storage = session.storage();
        let mut file_cache = HashMap::new();

        // List files from the homeserver
        let session_storage_list_fut = session_storage.list("/pub/wiki.app/").unwrap().send();
        match rt_arc_clone.block_on(session_storage_list_fut) {
            Ok(entries) => {
                for entry in &entries {
                    let file_url = entry.to_pubky_url();

                    // Synchronously fetch the content
                    let get_path_fut = pub_storage.get(&file_url);
                    match rt_arc_clone.block_on(get_path_fut) {
                        Ok(response) => {
                            let response_text_fut = response.text();
                            match rt_arc_clone.block_on(response_text_fut) {
                                Ok(content) => {
                                    let file_title = extract_title(&content);

                                    file_cache.insert(file_url, file_title.into());
                                }
                                Err(e) => {
                                    log::error!("Error reading content: {e}")
                                }
                            }
                        }
                        Err(e) => {
                            log::error!("Error fetching path {file_url}: {e}")
                        }
                    }
                }
            }
            Err(e) => log::error!("Failed to list files: {e}"),
        }

        *state_clone.lock().unwrap() = AuthState::Authenticated {
            session: session.clone(),
            pub_storage: pub_storage.clone(),
            file_cache,
        };
    }

    fn navigate_to_view_wiki_page(&mut self, user_pk: &str, page_id: &str) {
        self.selected_wiki_user_id = user_pk.to_string();
        self.selected_wiki_page_id = page_id.to_string();
        self.selected_wiki_content.clear();

        self.view_state = ViewState::ViewWiki;
    }

    fn navigate_to_edit_selected_wiki_page(&mut self) {
        self.edit_wiki_content = self.selected_wiki_content.clone();
        self.view_state = ViewState::EditWiki;
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
                        session,
                        ref pub_storage,
                        ref file_cache,
                    } => {
                        // Check if we need to refresh the files cache
                        if self.needs_refresh {
                            let state_clone = self.state.clone();

                            Self::fetch_files_and_update(
                                &session,
                                pub_storage,
                                self.rt.clone(),
                                state_clone,
                            );

                            self.needs_refresh = false;
                        }

                        let own_pk = session.info().public_key();

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
                                    if file_cache.is_empty() {
                                        ui.label("No wiki posts yet. Create your first one!");
                                    } else {
                                        for (file_url, file_title) in file_cache {
                                            // Extract just the filename from the URL
                                            let file_name =
                                                file_url.split('/').last().unwrap_or(file_url);

                                            if ui
                                                .button(format!("{file_name} ({file_title}...)"))
                                                .clicked()
                                            {
                                                self.navigate_to_view_wiki_page(
                                                    own_pk.to_string().as_str(),
                                                    file_name,
                                                );
                                            }
                                        }
                                    }
                                });
                            }
                            ViewState::CreateWiki => create_wiki::update(self, &session, ctx, ui),
                            ViewState::EditWiki => edit_wiki::update(self, &session, ctx, ui),
                            ViewState::ViewWiki => {
                                view_wiki::update(self, own_pk, &pub_storage, ctx, ui)
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

pub(crate) async fn update_wiki_post(
    session: &PubkySession,
    page_id: &str,
    content: &str,
) -> Result<()> {
    let path = format!("/pub/wiki.app/{}", page_id);

    // Update the post with the provided content
    session.storage().put(&path, content.to_string()).await?;

    log::info!("Updated post at path: {}", path);

    Ok(())
}

pub(crate) async fn delete_wiki_post(session: &PubkySession, page_id: &str) -> Result<()> {
    let path = format!("/pub/wiki.app/{}", page_id);

    // Delete the post
    session.storage().delete(&path).await?;

    log::info!("Deleted post at path: {}", path);

    Ok(())
}
