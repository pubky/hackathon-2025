use axum::{
    extract::State,
    response::Json,
    routing::get,
    Router,
};
use serde::Serialize;
use std::sync::{Arc, Mutex};
use tower_http::cors::CorsLayer;

#[derive(Clone)]
pub struct ApiState {
    pub homeserver_urls: Arc<Mutex<Vec<String>>>,
}

#[derive(Serialize)]
pub struct HomeserversResponse {
    pub homeservers: Vec<String>,
}

async fn get_homeservers(State(state): State<ApiState>) -> Json<HomeserversResponse> {
    let urls = state.homeserver_urls.lock().unwrap().clone();
    Json(HomeserversResponse { homeservers: urls })
}

pub fn create_router(state: ApiState) -> Router {
    Router::new()
        .route("/homeservers", get(get_homeservers))
        .layer(CorsLayer::permissive())
        .with_state(state)
}

pub async fn start_api_server(state: ApiState, port: u16) -> anyhow::Result<()> {
    let app = create_router(state);
    let addr = format!("127.0.0.1:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    println!("API server running on http://{}", addr);
    println!("  GET http://{}/homeservers - List all homeserver URLs", addr);

    axum::serve(listener, app).await?;
    Ok(())
}
