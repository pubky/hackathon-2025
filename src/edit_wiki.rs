use crate::{create_wiki_post, PubkyApp, ViewState};

use eframe::egui::{Context, Ui};
use pubky::PubkySession;

pub(crate) fn update(app: &mut PubkyApp, session: &PubkySession, _ctx: &Context, ui: &mut Ui) {
    ui.label("Create New Wiki Page");
    ui.add_space(20.0);

    // Textarea for wiki content
    ui.label("Content:");
    ui.add_space(10.0);

    egui::ScrollArea::vertical()
        .max_height(400.0)
        .show(ui, |ui| {
            ui.add(
                egui::TextEdit::multiline(&mut app.wiki_content)
                    .desired_width(f32::INFINITY)
                    .desired_rows(15),
            );
        });

    ui.add_space(20.0);

    // Save and Cancel buttons
    ui.horizontal(|ui| {
        if ui.button("Save wiki").clicked() {
            let session_clone = session.clone();
            let content = app.wiki_content.clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async {
                    match create_wiki_post(&session_clone, &content).await {
                        Ok(path) => {
                            println!("Created wiki post at: {}", path);
                        }
                        Err(e) => {
                            println!("Failed to create wiki post: {}", e);
                        }
                    }
                });
            });
            app.wiki_content.clear();
            app.view_state = ViewState::WikiList;
        }

        if ui.button("Cancel").clicked() {
            app.wiki_content.clear();
            app.view_state = ViewState::WikiList;
        }
    });
}
