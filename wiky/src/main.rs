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

use crate::utils::{extract_title, generate_qr_image, get_list};

mod create_wiki;
mod edit_wiki;
mod utils;
mod view_wiki;

const APP_NAME: &str = "Pubky Wiki";

fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let rt = Runtime::new()?;
    let app = PubkyApp::new(rt);

    // Load icon
    let icon = load_icon()?;

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([600.0, 700.0])
            .with_title(APP_NAME)
            .with_icon(icon),
        ..Default::default()
    };

    eframe::run_native(APP_NAME, options, Box::new(|_cc| Ok(Box::new(app))))
        .map_err(|e| anyhow!("{e}"))
}

fn load_icon() -> Result<egui::IconData> {
    let icon_path = "assets/logo.png";
    let image = image::open(icon_path)
        .map_err(|e| anyhow!("Failed to load icon: {e}"))?
        .into_rgba8();

    let (width, height) = image.dimensions();
    let rgba = image.into_raw();

    Ok(egui::IconData {
        rgba,
        width: width as u32,
        height: height as u32,
    })
}

fn load_logo_image() -> Option<egui::ColorImage> {
    let logo_path = "assets/logo.png";
    let image = image::open(logo_path).ok()?.into_rgba8();
    let size = [image.width() as usize, image.height() as usize];
    let pixels = image.into_raw();

    Some(egui::ColorImage::from_rgba_unmultiplied(size, &pixels))
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
    logo_texture: Option<egui::TextureHandle>,
    logo_image: Option<egui::ColorImage>,
    pub(crate) view_state: ViewState,
    /// Content for the Edit Wiki view
    pub(crate) edit_wiki_content: String,
    pub(crate) selected_wiki_fork_urls: Vec<String>,
    pub(crate) selected_wiki_page_id: String,
    pub(crate) selected_wiki_content: String,
    pub(crate) selected_wiki_user_id: String,
    pub(crate) needs_refresh: bool,
    cache: CommonMarkCache,
    rt: Arc<Runtime>,
    pub(crate) show_copy_tooltip: bool,
    /// Page ID from which content is being forked (when forking)
    pub(crate) forked_from_page_id: Option<String>,
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

        // Load logo image
        let logo_image = load_logo_image();

        Self {
            state,
            qr_texture: None,
            logo_texture: None,
            logo_image,
            view_state: ViewState::WikiList,
            edit_wiki_content: String::new(),
            selected_wiki_page_id: String::new(),
            selected_wiki_content: String::new(),
            selected_wiki_user_id: String::new(),
            selected_wiki_fork_urls: vec![],
            needs_refresh: false,
            cache: CommonMarkCache::default(),
            rt: rt_arc,
            show_copy_tooltip: false,
            forked_from_page_id: None,
        }
    }

    /// Fetch the list of files and their titles, then update the state with the file cache
    fn fetch_files_and_update(
        session: &PubkySession,
        pub_storage: &PublicStorage,
        rt_arc_clone: Arc<Runtime>,
        state_clone: Arc<Mutex<AuthState>>,
    ) {
        let mut file_cache = HashMap::new();

        match get_list(session, "/pub/wiki.app/", rt_arc_clone.clone()) {
            Ok(file_urls) => {
                for file_url in &file_urls {
                    // Synchronously fetch the content
                    let get_path_fut = pub_storage.get(file_url);
                    match rt_arc_clone.block_on(get_path_fut) {
                        Ok(response) => {
                            let response_text_fut = response.text();
                            match rt_arc_clone.block_on(response_text_fut) {
                                Ok(content) => {
                                    let file_title = extract_title(&content);

                                    file_cache.insert(file_url.into(), file_title.into());
                                }
                                Err(e) => log::error!("Error reading content: {e}"),
                            }
                        }
                        Err(e) => log::error!("Error fetching path {file_url}: {e}"),
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

    fn navigate_to_view_wiki_page(
        &mut self,
        user_pk: &str,
        page_id: &str,
        session: &PubkySession,
        pub_storage: &PublicStorage,
    ) {
        self.selected_wiki_user_id = user_pk.to_string();
        self.selected_wiki_page_id = page_id.to_string();
        self.selected_wiki_fork_urls = self.discover_fork_urls(session, pub_storage, page_id);
        self.selected_wiki_content.clear();

        self.view_state = ViewState::ViewWiki;
    }

    fn navigate_to_edit_selected_wiki_page(&mut self) {
        self.edit_wiki_content = self.selected_wiki_content.clone();
        self.view_state = ViewState::EditWiki;
    }

    fn get_my_follows(&self, session: &PubkySession) -> Vec<String> {
        get_list(session, "/pub/pubky.app/follows/", self.rt.clone())
            .inspect_err(|e| log::error!("Failed to get follows: {e}"))
            .map(|list| {
                list.iter()
                    .map(|path| path.split('/').last().unwrap_or(&path).to_string())
                    .collect()
            })
            .unwrap_or_default()
    }

    fn discover_fork_urls(
        &self,
        session: &PubkySession,
        pub_storage: &PublicStorage,
        page_id: &str,
    ) -> Vec<String> {
        let follows = self.get_my_follows(session);

        let mut result = vec![];

        // Add the current user's version as a fork (root version)
        let own_pk = session.info().public_key().to_string();
        result.push(format!("{own_pk}/{page_id}"));

        for follow_pk in follows {
            let fork_path = format!("pubky://{follow_pk}/pub/wiki.app/{page_id}");
            log::info!("fork_path = {fork_path}");
            let exists_fut = pub_storage.get(fork_path);

            match self.rt.block_on(exists_fut) {
                Ok(_) => result.push(format!("{follow_pk}/{page_id}")),
                Err(e) => log::error!("Failed to check if file exists: {e}"),
            }
        }
        result
    }
}

impl eframe::App for PubkyApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::CentralPanel::default().show(ctx, |ui| {
            ui.vertical_centered(|ui| {
                ui.add_space(30.0);

                // Display logo
                if self.logo_texture.is_none() {
                    if let Some(logo_image) = &self.logo_image {
                        self.logo_texture = Some(ui.ctx().load_texture(
                            "logo",
                            logo_image.clone(),
                            Default::default(),
                        ));
                    }
                }

                if let Some(texture) = &self.logo_texture {
                    let logo_size = egui::vec2(80.0, 80.0);
                    ui.add(egui::Image::from_texture(texture).max_size(logo_size));
                    ui.add_space(15.0);
                }

                ui.heading(egui::RichText::new(APP_NAME).size(24.0).strong());
                ui.add_space(30.0);

                let state = self.state.lock().unwrap().clone();

                match state {
                    AuthState::Initializing => {
                        ui.add_space(20.0);
                        ui.spinner();
                        ui.add_space(10.0);
                        ui.label(egui::RichText::new("Initializing authentication...").size(16.0));
                    }
                    AuthState::ShowingQR { ref auth_url } => {
                        ui.label(egui::RichText::new("Scan this QR code with your Pubky app to login:").size(16.0));
                        ui.add_space(25.0);

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

                        ui.add_space(15.0);
                        ui.label(egui::RichText::new("Waiting for authentication...").italics());
                        ui.add_space(5.0);
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
                                ui.add_space(10.0);
                                let create_button = ui.add_sized(
                                    [200.0, 40.0],
                                    egui::Button::new(egui::RichText::new("✨ Create New Wiki Page").size(16.0))
                                );
                                if create_button.clicked() {
                                    self.view_state = ViewState::CreateWiki;
                                }
                                ui.add_space(30.0);

                                ui.label(egui::RichText::new("My Wiki Posts").size(18.0).strong());
                                ui.add_space(15.0);

                                // List all wiki posts as buttons
                                egui::ScrollArea::vertical().show(ui, |ui| {
                                    if file_cache.is_empty() {
                                        ui.add_space(10.0);
                                        ui.label(egui::RichText::new("No wiki posts yet. Create your first one!").italics().color(egui::Color32::GRAY));
                                    } else {
                                        let pk = own_pk.to_string();
                                        for (file_url, file_title) in file_cache {
                                            // Extract just the filename from the URL
                                            let file_name =
                                                file_url.split('/').last().unwrap_or(file_url);

                                            ui.horizontal(|ui| {
                                                if ui.button(egui::RichText::new(file_name).monospace()).clicked() {
                                                    self.navigate_to_view_wiki_page(
                                                        &pk,
                                                        file_name,
                                                        &session,
                                                        pub_storage,
                                                    );
                                                }

                                                ui.label(egui::RichText::new(file_title).strong());
                                            });
                                            ui.add_space(5.0);
                                        }
                                    }
                                });
                            }
                            ViewState::CreateWiki => create_wiki::update(self, &session, ctx, ui),
                            ViewState::EditWiki => edit_wiki::update(self, &session, ctx, ui),
                            ViewState::ViewWiki => {
                                view_wiki::update(self, &session, &pub_storage, ctx, ui)
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

pub(crate) async fn create_wiki_post(
    session: &PubkySession,
    content: &str,
    filename: Option<&str>,
) -> Result<String> {
    let path = if let Some(fname) = filename {
        format!("/pub/wiki.app/{}", fname)
    } else {
        format!("/pub/wiki.app/{}", Uuid::new_v4())
    };

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
