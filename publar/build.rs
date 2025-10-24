use std::process::Command;

fn main() {
    // Tell Cargo to rerun this script if any Rust source files change
    println!("cargo:rerun-if-changed=src/");
    println!("cargo:rerun-if-changed=assets/input.css");
    println!("cargo:rerun-if-changed=tailwind.config.js");

    // Run Tailwind CSS build
    let output = Command::new("npx")
        .args([
            "tailwindcss",
            "-i",
            "./assets/input.css",
            "-o",
            "./assets/tailwind.css",
            "--minify",
        ])
        .output()
        .expect("Failed to run Tailwind CSS build");

    if !output.status.success() {
        eprintln!("Tailwind CSS build failed:");
        eprintln!("{}", String::from_utf8_lossy(&output.stderr));
        std::process::exit(1);
    }

    println!("Tailwind CSS build complete");
}
