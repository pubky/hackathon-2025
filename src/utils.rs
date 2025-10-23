use std::sync::Arc;

use pubky::PubkySession;
use qrcode::QrCode;
use tokio::runtime::Runtime;

pub fn generate_qr_image(url: &str) -> Option<egui::ColorImage> {
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

/// In this context, the title is the readable text on the 1st line
pub fn extract_title(input: &str) -> &str {
    // Get the first line by splitting on newlines and taking the first element
    let first_line = input.lines().next().unwrap_or("");
    first_line.trim_start_matches("# ")
}

pub fn extract_details_wiki_url(url: &str) -> Option<(String, String)> {
    // Split once on '/' and collect the two parts.
    let mut parts = url.splitn(2, '/');

    let first = parts.next()?.trim();
    let second = parts.next()?.trim();

    // Ensure both parts are present and not empty.
    if first.is_empty() || second.is_empty() {
        log::warn!("Invalid Pubky Wiki link: {url}");
        return None;
    }

    Some((first.to_string(), second.to_string()))
}

/// List files from the homeserver
pub fn get_list(
    session: &PubkySession,
    folder_path: &str,
    rt: Arc<Runtime>,
) -> anyhow::Result<Vec<String>> {
    let session_storage = session.storage();
    let session_storage_list_fut = session_storage.list(folder_path).unwrap().send();

    log::info!("listing {folder_path}");

    let mut result_list = vec![];
    for entry in rt.block_on(session_storage_list_fut)? {
        result_list.push(entry.to_pubky_url());
    }

    Ok(result_list)
}
