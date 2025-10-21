use pubky::{Capabilities, Pubky};

#[tokio::test]
async fn test_pubky_initialization() {
    // Test that we can initialize Pubky
    let result = Pubky::new();
    assert!(result.is_ok(), "Failed to initialize Pubky: {:?}", result.err());
}

#[tokio::test]
async fn test_auth_flow_creation() {
    // Test that we can create an auth flow
    let pubky = Pubky::new().expect("Failed to initialize Pubky");
    let caps = Capabilities::default();
    let flow = pubky.start_auth_flow(&caps);
    assert!(flow.is_ok(), "Failed to create auth flow: {:?}", flow.err());
    
    if let Ok(flow) = flow {
        let auth_url = flow.authorization_url();
        assert!(auth_url.to_string().starts_with("pubkyauth://"));
        println!("Auth URL: {}", auth_url);
    }
}

#[test]
fn test_qr_code_generation() {
    use qrcode::QrCode;
    
    let test_url = "pubkyauth://example";
    let qr = QrCode::new(test_url.as_bytes());
    assert!(qr.is_ok(), "Failed to create QR code");
}
