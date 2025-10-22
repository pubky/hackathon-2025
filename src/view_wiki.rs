use crate::{PubkyApp, ViewState};

use eframe::egui::{Context, Ui};
use egui_commonmark::CommonMarkViewer;
use pubky::PublicStorage;

pub(crate) fn update(
    app: &mut PubkyApp,
    public_storage: &PublicStorage,
    _ctx: &Context,
    ui: &mut Ui,
) {
    ui.label("View Wiki Post");
    ui.add_space(20.0);

    ui.label(format!("User ID: {}", &app.selected_wiki_user_id));
    ui.add_space(10.0);
    ui.label(format!("Page ID: {}", &app.selected_wiki_page_id));
    ui.add_space(10.0);

    // Display content in a scrollable area
    egui::ScrollArea::vertical()
        .max_height(400.0)
        .show(ui, |ui| {
            // Try to fetch content if empty
            if app.selected_wiki_content.is_empty()
                && !app.selected_wiki_page_id.is_empty()
                && !app.selected_wiki_user_id.is_empty()
            {
                let public_storage_clone = public_storage.clone();
                let path_clone = app.selected_wiki_page_id.clone();
                let user_id = app.selected_wiki_user_id.clone();

                let path = format!("pubky{user_id}/pub/wiki.app/{path_clone}");

                // Synchronously fetch the content
                let rt = tokio::runtime::Runtime::new().unwrap();
                match rt.block_on(async { public_storage_clone.get(&path).await }) {
                    Ok(response) => {
                        let rt2 = tokio::runtime::Runtime::new().unwrap();
                        match rt2.block_on(async { response.text().await }) {
                            Ok(text) => {
                                app.selected_wiki_content = text;
                            }
                            Err(e) => {
                                app.selected_wiki_content = format!("Error reading content: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        app.selected_wiki_content = format!("Error fetching path {path}: {}", e);
                    }
                }
            }

            egui::ScrollArea::vertical().show(ui, |ui| {
                CommonMarkViewer::new().max_image_width(Some(512)).show(
                    ui,
                    &mut app.cache,
                    &app.selected_wiki_content.as_str(),
                );
            });

            // Intercept link clicks by checking the output commands
            let clicked_urls: Vec<String> = ui.ctx().output_mut(|o| {
                let mut urls = Vec::new();
                // Drain commands to prevent external opening and capture URLs
                o.commands.retain(|cmd| {
                    if let egui::output::OutputCommand::OpenUrl(open_url) = cmd {
                        // log::info!("🔗 Intercepted link click: {}", open_url.url);
                        println!("🔗 Intercepted link click: {}", open_url.url);
                        urls.push(open_url.url.to_string());
                        false // Remove this command to prevent external opening
                    } else {
                        true // Keep other commands
                    }
                });
                urls
            });

            // Navigate to clicked URLs
            for url in clicked_urls {
                let mut parts = url.split('/'); // Split on the '/' character
                if let (Some(user_pk), Some(page_id)) = (parts.next(), parts.next()) {
                    app.navigate_to_wiki_page(user_pk, page_id);
                } else {
                    // None // Return None if the split doesn't yield two parts
                };
            }
        });

    ui.add_space(20.0);

    // Go back button
    if ui.button("Go back").clicked() {
        app.selected_wiki_page_id.clear();
        app.selected_wiki_content.clear();
        app.view_state = ViewState::WikiList;
    }
}
