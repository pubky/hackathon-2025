#!/bin/bash
# Demo script to run the Pubky Desktop App

echo "Building the Pubky Desktop App..."
cargo build --release

if [ $? -eq 0 ]; then
    echo "Build successful!"
    echo ""
    echo "To run the application:"
    echo "  ./target/release/pubky-desktop-app"
    echo ""
    echo "The app will:"
    echo "1. Show a window with a login QR code"
    echo "2. Wait for you to scan the QR code with a Pubky-compatible app"
    echo "3. Display your User Public Key once authenticated"
else
    echo "Build failed!"
    exit 1
fi
