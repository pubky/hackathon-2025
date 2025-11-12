use crate::{delete_wiki_post, update_wiki_post, AuthState, PubkyApp, ViewState};

use eframe::egui::{Context, Ui};
use pubky::PubkySession;

pub(crate) fn update(app: &mut PubkyApp, session: &PubkySession, _ctx: &Context, ui: &mut Ui) {
    ui.label(egui::RichText::new("Edit Wiki Page").size(20.0).strong());
    ui.add_space(25.0);

    // Textarea for wiki content
    ui.label(egui::RichText::new("Content:").size(16.0));
    ui.add_space(12.0);

    egui::ScrollArea::vertical()
        .max_height(400.0)
        .show(ui, |ui| {
            ui.add(
                egui::TextEdit::multiline(&mut app.edit_wiki_content)
                    .desired_width(f32::INFINITY)
                    .desired_rows(15)
                    .font(egui::TextStyle::Monospace),
            );
        });

    ui.add_space(25.0);

    ui.horizontal(|ui| {
        let update_button = ui.add_sized(
            [120.0, 35.0],
            egui::Button::new(egui::RichText::new("✓ Update").size(15.0))
        );
        if update_button.clicked() {
            let session_clone = session.clone();
            let content = app.edit_wiki_content.clone();
            let page_id = app.selected_wiki_page_id.clone();

            let update_wiki_post_fut = update_wiki_post(&session_clone, &page_id, &content);
            match app.rt.block_on(update_wiki_post_fut) {
                Ok(_) => {
                    log::info!("Updated wiki post: {}", page_id);
                    // Update the selected content to reflect changes
                    app.selected_wiki_content = content;
                }
                Err(e) => log::error!("Failed to update wiki post: {e}"),
            }

            app.edit_wiki_content.clear();
            app.view_state = ViewState::WikiList;
            app.needs_refresh = true;
        }

        ui.add_space(10.0);
        // Delete button for editing existing page
        let delete_button = ui.add_sized(
            [120.0, 35.0],
            egui::Button::new(egui::RichText::new("🗑 Delete").size(15.0).color(egui::Color32::from_rgb(200, 80, 80)))
        );
        if delete_button.clicked() {
            let session_clone = session.clone();
            let page_id = app.selected_wiki_page_id.clone();
            let state_clone = app.state.clone();

            let delete_wiki_post_fut = delete_wiki_post(&session_clone, &page_id);
            match app.rt.block_on(delete_wiki_post_fut) {
                Ok(_) => {
                    log::info!("Deleted wiki post: {}", page_id);

                    // Remove from file_urls list
                    if let Ok(mut state) = state_clone.lock() {
                        if let AuthState::Authenticated {
                            ref session,
                            ref mut file_cache,
                            ..
                        } = *state
                        {
                            let own_user_pk = session.info().public_key().to_string();
                            let file_url = format!("pubky://{own_user_pk}/pub/wiki.app/{page_id}");
                            file_cache.remove(&file_url);
                        }
                    }
                }
                Err(e) => log::error!("Failed to delete wiki post: {e}"),
            }

            app.edit_wiki_content.clear();
            app.selected_wiki_page_id.clear();
            app.selected_wiki_content.clear();
            app.selected_wiki_fork_urls.clear();
            app.view_state = ViewState::WikiList;
            app.needs_refresh = true;
        }

        ui.add_space(10.0);
        let cancel_button = ui.add_sized(
            [120.0, 35.0],
            egui::Button::new(egui::RichText::new("Cancel").size(15.0))
        );
        if cancel_button.clicked() {
            app.edit_wiki_content.clear();
            app.view_state = ViewState::WikiList;
        }
    });
}
