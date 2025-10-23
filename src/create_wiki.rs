use crate::{create_wiki_post, utils::extract_title, AuthState, PubkyApp, ViewState};

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
                egui::TextEdit::multiline(&mut app.edit_wiki_content)
                    .desired_width(f32::INFINITY)
                    .desired_rows(15),
            );
        });

    ui.add_space(20.0);

    ui.horizontal(|ui| {
        // Save button for creating new page
        if ui.button("Save wiki").clicked() {
            let session_clone = session.clone();
            let content = app.edit_wiki_content.clone();
            let state_clone = app.state.clone();
            let filename = app.forked_from_page_id.as_deref();

            let create_wiki_post_fut = create_wiki_post(&session_clone, &content, filename);
            match app.rt.block_on(create_wiki_post_fut) {
                Ok(wiki_page_path) => {
                    log::info!("Created wiki post at: {}", wiki_page_path);

                    // Convert path to pubky URL format for the file_cache list
                    if let Ok(mut state) = state_clone.lock() {
                        if let AuthState::Authenticated {
                            ref session,
                            ref mut file_cache,
                            ..
                        } = *state
                        {
                            let own_user_pk = session.info().public_key().to_string();
                            let file_url = format!("pubky://{own_user_pk}{wiki_page_path}");
                            let file_title = extract_title(&content);
                            file_cache.insert(file_url, file_title.into());
                        }
                    }
                }
                Err(e) => log::error!("Failed to create wiki post: {e}"),
            }

            app.edit_wiki_content.clear();
            app.forked_from_page_id = None;
            app.view_state = ViewState::WikiList;
        }

        if ui.button("Cancel").clicked() {
            app.edit_wiki_content.clear();
            app.forked_from_page_id = None;
            app.view_state = ViewState::WikiList;
        }
    });
}
