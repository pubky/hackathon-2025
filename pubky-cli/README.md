[![CI](https://github.com/pubky/pubky-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/pubky/pubky-cli/actions/workflows/ci.yml)
[![Crates.io](https://img.shields.io/crates/v/pubky-cli.svg)](https://crates.io/crates/pubky-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

# Pubky CLI

A Rust-based command line companion for interacting with Pubky homeservers. It wraps both the
admin and user-facing APIs, reusing the official `pubky` SDK (`0.6.0-rc.6`) and the
`pubky-testnet` harness so you can automate local testing or drive a real deployment from scripts.

## Features

- **User flows** - signup, signin, session inspection, signout, directory listing, and third-party auth token hand-off.
- **Admin flows** - generate invite tokens, gather server stats, enable/disable users, and delete WebDAV entries.
- **Integration testing** - comprehensive end-to-end tests spin up an ephemeral testnet and call the real CLI via `assert_cmd`.
- **Continuous integration** - GitHub Actions workflow runs format checks and the full test suite on every push/PR.

## Requirements

- Rust toolchain (1.76 or newer is recommended)
- `cargo` (ships with Rust)
- For local development: a running homeserver (e.g. `cargo run -p pubky-homeserver -- --data-dir ~/.pubky`) or the `pubky-testnet` binary.

## Quick Start

```bash
# Clone and install
cargo install --path .

# Run the CLI (examples assume the admin API listens on http://127.0.0.1:6288)
PUBKY_ADMIN_PASSWORD=admin pubky-cli admin info

# Create a recovery file (writes ./alice.recovery and prints the pubkey)
pubky-cli tools generate-recovery ./alice.recovery --passphrase pass

# Signup a user (passphrase entered interactively unless the env var below is set)
PUBKY_CLI_RECOVERY_PASSPHRASE=pass pubky-cli user signup --singup-code <signup-code> <homeserver-pk> ./alice.recovery --testnet
```

### Common Flows

Once your homeserver is running locally you can drive full workflows directly from this CLI.

#### User Onboarding (local testnet)

```bash
# 1) Create a recovery file and note the printed public key
pubky-cli tools generate-recovery ./alice.recovery --passphrase pass

# 2) Sign up; replace <homeserver-pk> with your server's public key
PUBKY_CLI_RECOVERY_PASSPHRASE=pass \
  pubky-cli user signup <homeserver-pk> ./alice.recovery --testnet

# 3) Sign in to establish a session
PUBKY_CLI_RECOVERY_PASSPHRASE=pass \
  pubky-cli user signin ./alice.recovery --testnet

# 4) Inspect the active session
PUBKY_CLI_RECOVERY_PASSPHRASE=pass \
  pubky-cli user session ./alice.recovery --testnet

# 5) Sign out when finished
PUBKY_CLI_RECOVERY_PASSPHRASE=pass \
  pubky-cli user signout ./alice.recovery --testnet
```

#### User Publish/Get/Delete Data

```bash
# 1) Publish data from file
PUBKY_CLI_RECOVERY_PASSPHRASE=pass \
  pubky-cli user publish "/pub/my-cool-app/hello.txt" test.txt ./alice.recovery --testnet

# 2) Get data by path
PUBKY_CLI_RECOVERY_PASSPHRASE=pass \
  pubky-cli user get /pub/my-cool-app/hello.txt ./alice.recovery 

# 3) Delete data by path
PUBKY_CLI_RECOVERY_PASSPHRASE=pass \
  pubky-cli user delete "/pub/my-cool-app/hello.txt" ./alice.recovery 
```


#### Admin: temporarily disable / enable a user

```bash
# Use the user's public key printed during signup
PUBKY_ADMIN_PASSWORD=admin pubky-cli admin user disable <user-pubkey>

# Re-enable the same user
PUBKY_ADMIN_PASSWORD=admin pubky-cli admin user enable <user-pubkey>
```

The examples above assume defaults (`http://127.0.0.1:6288` for the admin API and `--testnet`
for local wiring). Adjust or omit those flags for other environments.

### Shell Completions

Generate completion scripts directly from the CLI:

```bash
# Bash example (writes to Homebrew's completion directory)
pubky-cli tools completions bash --outfile "$(brew --prefix)/etc/bash_completion.d/pubky-cli"

# Zsh example (place in a directory included in $fpath)
mkdir -p ~/.zfunc
echo 'fpath+=("$HOME/.zfunc")' >> ~/.zshrc   # run once if needed
pubky-cli tools completions zsh --outfile ~/.zfunc/_pubky-cli
```

Supported shells: `bash`, `zsh`, `fish`, `powershell`, and `elvish`. After generating a script,
reload your shell or source the file (e.g. `source ~/.zshrc`) to enable tab-completion.

### Environment Variables

| Variable                        | Purpose                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `PUBKY_ADMIN_PASSWORD`          | Password passed to admin endpoints; can be set globally instead of `--password`.  |
| `PUBKY_CLI_RECOVERY_PASSPHRASE` | Optional passphrase to automatically decrypt recovery files (useful in CI/tests). |
| `PUBKY_PKARR_BOOTSTRAP`         | Optional comma-separated list of `<host>:<port>` pairs to override PKARR bootstrap nodes.  |
| `PUBKY_PKARR_RELAYS`            | Optional comma-separated list of relay URLs if you want to target custom PKARR relays.     |
| `PUBKY_PKARR_TIMEOUT_MS`        | Optional override (in milliseconds) for PKARR request timeout.                    |

### Running Tests

```bash
# Unit + end-to-end tests (uses pubky-testnet internally)
cargo test
```

The integration tests create temporary recovery files and launch a sandboxed Pubky testnet, so no additional setup is required.

## Continuous Integration

The repo ships with `.github/workflows/ci.yml`. Each run performs:

1. `cargo fmt --check`
2. `cargo test --all`

Caching is enabled for the cargo registry, git index, and the `target` directory to keep the workflow fast.

## Project Layout

```
├── src/
│   ├── admin.rs    # admin subcommands + HTTP wrapper
│   ├── tools.rs    # helper utilities, e.g., recovery-file generator
│   ├── user.rs     # user subcommands built on the pubky SDK
│   ├── util.rs     # shared helpers (builders, recovery-file handling)
│   └── main.rs     # thin entrypoint wiring clap + modules
├── tests/
│   └── integration.rs  # admin + user e2e coverage using pubky-testnet
├── Cargo.toml
├── LICENSE
└── README.md
```

## Useful References

- [Pubky SDK docs](https://docs.rs/pubky/0.6.0-rc.6/pubky/)
- [pubky-core repository](https://github.com/pubky/pubky-core)

Feedback and contributions are welcome—feel free to open issues or PRs!\*\*\*
