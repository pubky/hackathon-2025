use crate::{PubkyApp, ViewState};

use eframe::egui::{Context, Ui};
use egui_commonmark::CommonMarkViewer;
use pubky::PubkySession;

pub(crate) fn update(app: &mut PubkyApp, session: &PubkySession, _ctx: &Context, ui: &mut Ui) {
    ui.label("View Wiki Post");
    ui.add_space(20.0);

    // Display filename
    let file_name = app
        .selected_wiki_path
        .split('/')
        .last()
        .unwrap_or(&app.selected_wiki_path);
    ui.label(format!("File: {}", file_name));
    ui.add_space(10.0);

    // Display content in a scrollable area
    egui::ScrollArea::vertical()
        .max_height(400.0)
        .show(ui, |ui| {
            // Try to fetch content if empty
            if app.selected_wiki_content.is_empty() && !app.selected_wiki_path.is_empty() {
                let session_clone = session.clone();
                let path_clone = app.selected_wiki_path.clone();

                // Synchronously fetch the content
                let rt = tokio::runtime::Runtime::new().unwrap();
                match rt.block_on(async { session_clone.storage().get(&path_clone).await }) {
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
                        app.selected_wiki_content = format!("Error fetching file: {}", e);
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
        });

    ui.add_space(20.0);

    // Go back button
    if ui.button("Go back").clicked() {
        app.selected_wiki_path.clear();
        app.selected_wiki_content.clear();
        app.view_state = ViewState::WikiList;
    }
}
