# Pubky Internal Hackathon Lugano 2025

<img width="1536" height="1024" alt="ChatGPT Image Oct 9, 2025, 01_44_28 PM" src="https://github.com/user-attachments/assets/73777d5a-d277-45e0-a020-3d8e1dcc2f52" />

---

This repository contains the project submissions for the Lugano Plan B Pubky Hackathon.

**Purpose:** stress-test **Pubky Core (SDK)** by building real, runnable outputs. Expose friction, validate design assumptions, and ship usable demos.

---

## Repository Workflow

Repository: `pubky/hackathon-2025`

1. **Fork** the repository.
2. **Clone** your fork locally.
3. **Create a subfolder** at repo root for your project:

   - Use team or individual name, **no spaces**. Prefer `kebab-case` .
   - Example: `super-team/` or `jane-doe/`.
   - If you want your project to be a stand alone repository. Feel free commit it here as a [gitsubmodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules)

4. Build **only inside your subfolder**.
5. Include **README.md**, **MIT LICENSE**, and all required assets to build/run.
6. Open a **Pull Request** from your fork to the main repo when done.

Suggested Git hygiene:

- One PR per project folder.
- No history rewriting after presentations begin.
- Keep PR scope to your folder.

---

## Timeline

| Phase                                                                                                                           | Date      |      Time | Activity                     | Notes                                   |
| ------------------------------------------------------------------------------------------------------------------------------- | --------- | --------: | ---------------------------- | --------------------------------------- |
| Pre-event Prep                                                                                                                  | Oct 6–13  |         - | Post ideas on Slack          | Gather minimal feedback; cut weak ideas |
| [Team Formation (sheet)](https://docs.google.com/spreadsheets/d/1IoFbuMGijKnR_AJBmAQMJcJATSQyvZFYg41YoCFDdJM/edit?gid=0#gid=0)  | Oct 6–13  |         - | Announce teams (pairs ideal) | Teams confirmed before travel           |
| Kickoff                                                                                                                         | Oct 21    |       1 h | Overview                     | Goals, tools, scoring, prizes           |
| Day 1                                                                                                                           | Oct 22    |    ~6–8 h | Build session                | Breaks as needed                        |
| Day 2 (AM)                                                                                                                      | Oct 23    | 30–45 min | Quick team updates           | Progress, pivots, blockers              |
| Day 2                                                                                                                           | Oct 23    |    ~6–8 h | Build session                | -                                       |
| Day 2 (PM)                                                                                                                      | Oct 23    |   1–1.5 h | Final presentations          | Show deliverables                       |
| Day 2 (PM)                                                                                                                      | Oct 23    |      ~1 h | Voting + prizes              | Popular vote, scoring, awards           |
| Plan B (if needed)                                                                                                              | Oct 24 AM |     0.5 h | Announce winners             | Only if delayed                         |

During the broader meetup/conference you may continue polishing, documenting, or hardening. Key demos may be promoted to roadmap items and require a proper wrap-up.

---

## Deliverables Checklist

- **Runnable demo**: live website (e.g. github page), desktop binary, CLI, APK, or equivalent.
- **Source code** under your subfolder with reproducible build steps.
- **README.md**: what it does, why it matters, setup/run steps, architecture sketch.
- **Feedback form (mandatory)**: frictions, surprises, failures, misunderstandings, and time-wasters. [Feedback form here.](https://forms.gle/yCm461GeRpZMLCdZ8)
- **License**: `MIT` file in your subfolder.
- **Presentation** (2–3 min outcome, +2–3 min architecture if useful).
- **PR** to the main repo from your fork. Do not commit tokens or secrets!

---

## Pubky SDK: Setup and Test Paths

Primary materials:

Rust:

- Crate: https://crates.io/crates/pubky/0.6.0-rc.6
- Docs: https://docs.rs/pubky/0.6.0-rc.6/pubky/index.html
- Examples: https://github.com/pubky/pubky-core/tree/main/examples/rust

Javascript:

- NPM package: https://www.npmjs.com/package/@synonymdev/pubky/v/0.6.0-rc.6
- Examples: https://github.com/pubky/pubky-core/tree/main/examples/javascript

Two kind of development environments:

### 1) Local Testnet (offline)

**Rust**

You can embed an ephimeral testnet using the `pubky-testnet` crate for full local development.

```sh
cargo add pubky-testnet@=0.6.0-rc.6
```

Check out [examples/testnet](https://github.com/pubky/pubky-core/tree/main/examples/rust/1-testnet) to learn how to create from a tiny app performing signup/put/get against an ephemeral local testnet.

You can also run it as a separate process by:

```sh
cargo install pubky-testnet --version 0.6.0-rc.6
pubky-testnet

# then instantiate the sdk facade with Pubky::testnet()
```

**Javascript**

Run a local testnet:

```bash
# Requires the rust toolchain. Install with:
# curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install pubky-testnet
pubky-testnet
```

Just make sure you always instantiate the testnet version of the SDK by

```js
const pubky = Pubky.testnet();
```

Check out [examples/testnet](https://github.com/pubky/pubky-core/blob/refactor/breaking-pubky-client/examples/javascript/1-testnet.mjs) to learn how to create from a tiny app performing signup/put/get the local testnet.

### 2) Staging Homeserver (shared)

- Staging homeserver public key: `ufibwbmed6jeq9k4p583go95wofakh9fwpp4k734trq79pd9u1uy`

- Staging homeserver requires invitation codes to create users. You can generate invitation codes by running:

```sh
curl -X GET \
"https://admin.homeserver.staging.pubky.app/generate_signup_token" \
  -H "X-Admin-Password: voyage tuition cabin arm stock guitar soon salute"
```

---

## Rules

- Use **Pubky SDK** for Pubky-supported features.
- Collaborate in person during build days.
- One project per team; teams ideally of two.
- No self-voting. Violations mean disqualification.

---

## Scoring

| Criteria                  | Description                                                                       |      Weight |
| ------------------------- | --------------------------------------------------------------------------------- | ----------: |
| Complexity                | Original, extensive, or technically deep use of Pubky to achieve goals            |         15% |
| Creativity / Practicality | Goes beyond “Hello World”; novel and broadly useful                               |         15% |
| Readiness                 | Boolean. Live, interactive demo usable without cloning                            |         10% |
| Team Presentation         | ~5 min: what, why, learnings, Pubky’s role                                        |         15% |
| Feedback                  | Clear documentation of process and friction points                                |         15% |
| Popular Vote              | Participants vote; self-vote = disqualification                                   |         15% |
| AI Vote                   | Average of ChatGPT and Claude to: `Rate this project from 0 to 10 {all codebase}` |         15% |
| Boss’ Vote                | John’s personal vote                                                              | Tie-breaker |

Total weighted points = 100. Tie resolved by Boss’ vote.

---

## Prizes

- **1st**: Amazon vouchers **$500** split across team + **Pubky Champion** title + Pubky Crown
- **2nd**: Amazon vouchers **$300** split across team
- **3rd**: Amazon vouchers **$200** split across team
- **Most Innovative Project**: Amazon vouchers **$100** split across team

---

## Security and Hygiene

- Do not commit secrets, tokens, or private packages.
- Verify `.gitignore` before first commit. Use `git status` to confirm no sensitive files are tracked.
- Keep dependencies minimal and documented.
- Provide deterministic build steps.

---

## Presentation

- ~5 minutes per team.
- Show the live demo first, then architecture and key Pubky flows.
- Highlight frictions and proposed fixes if any.

---

Happy hacking!
