use eframe::egui;
use pubky::{Capabilities, Pubky, PubkyAuthFlow};
use std::sync::{Arc, Mutex};

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

#[derive(Debug, Clone)]
enum AuthState {
    Initializing,
    ShowingQR { auth_url: String },
    Authenticated { public_key: String },
    Error(String),
}

struct PubkyApp {
    state: Arc<Mutex<AuthState>>,
    qr_texture: Option<egui::TextureHandle>,
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
                                *state_clone.lock().unwrap() =
                                    AuthState::Authenticated { public_key: pk };
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
        }
    }

    fn generate_qr_image(&self, url: &str) -> Option<egui::ColorImage> {
        use qrcode::QrCode;

        let qr = QrCode::new(url.as_bytes()).ok()?;
        let qr_image = qr.render::<image::Luma<u8>>().build();

        let (width, height) = qr_image.dimensions();
        let scale = 2; // Scale QR code to fit within window
        let scaled_width = (width * scale) as usize;
        let scaled_height = (height * scale) as usize;

        let mut pixels = Vec::with_capacity(scaled_width * scaled_height);

        for y in 0..scaled_height {
            for x in 0..scaled_width {
                let orig_x = x as u32 / scale;
                let orig_y = y as u32 / scale;
                let pixel = qr_image.get_pixel(orig_x, orig_y);
                let color = if pixel[0] < 128 {
                    egui::Color32::BLACK
                } else {
                    egui::Color32::WHITE
                };
                pixels.push(color);
            }
        }

        Some(egui::ColorImage::new([scaled_width, scaled_height], pixels))
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
                            if let Some(qr_image) = self.generate_qr_image(auth_url) {
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
                    AuthState::Authenticated { ref public_key } => {
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

async fn initialize_auth() -> Result<(PubkyAuthFlow, String), Box<dyn std::error::Error>> {
    let pubky = Pubky::new()?;
    let caps = Capabilities::default();
    let flow = pubky.start_auth_flow(&caps)?;
    let auth_url = flow.authorization_url().to_string();

    Ok((flow, auth_url))
}
