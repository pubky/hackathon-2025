# Cooky - The Pubky SDK Cookbook

A developer-friendly, interactive cookbook for building on the Pubky ecosystem. Cooky provides ready-to-use code snippets and practical examples for working with the Pubky SDK.

## What is Cooky?

Cooky is an interactive web application that serves as a comprehensive guide for developers learning to build with Pubky. It features:

- **Working Code Snippets**: Every recipe includes production-ready Rust code that compiles against Pubky 0.6 series
- **Syntax Highlighting**: Color-coded code for better readability
- **Copy & Paste Ready**: One-click copying of code snippets with instant feedback
- **Interactive Flipbook**: Smooth page-turning animations create an engaging cookbook experience
- **Organized Categories**: Recipes grouped by Identity, Storage, Authentication, Discovery, and Testing
- **Search Functionality**: Quick search across recipes, commands, and code
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Why Cooky Matters

Building decentralized applications requires understanding new protocols and patterns. Cooky bridges the gap between documentation and implementation by:

1. **Reducing Friction**: Developers can immediately copy working examples instead of piecing together documentation
2. **Teaching Best Practices**: Each recipe demonstrates proper usage patterns, security considerations, and common pitfalls
3. **Accelerating Development**: Quick access to common operations (signup, file storage, authentication) speeds up prototyping
4. **Lowering the Learning Curve**: Structured, progressive examples help newcomers understand the Pubky ecosystem

## What is Pubky?

Pubky is a decentralized identity and data storage protocol that enables users to own and control their data. It provides:

- Cryptographic identities (keypairs)
- Distributed storage (homeservers)
- Public key infrastructure for data access
- Authentication and authorization capabilities

Cooky helps developers leverage these capabilities to build the next generation of user-controlled applications.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173` to explore the cookbook.

### Build

```bash
npm run build
```

## Using the Recipes

1. **Browse**: Navigate through categories using the sidebar or flip through pages
2. **Search**: Use the search bar to find specific operations or concepts
3. **Copy**: Click the copy button on any code snippet
4. **Implement**: Paste the code into your Rust project and customize as needed

## Technology Stack

- **React**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations
- **react-pageflip**: Interactive flipbook experience
- **Lucide React**: Beautiful icons

## Recipe Categories

- **Introduction**: Getting started with Pubky and Cooky
- **Identity**: Creating clients, signing up, generating keypairs
- **Storage**: Writing, reading, listing, and deleting files
- **Authentication**: Managing capabilities and tokens
- **Discovery**: Resolving homeservers and discovering peers
- **Testing**: Local development with pubky-testnet

## Contributing

Cooky is designed to grow with the Pubky ecosystem. Contributions for new recipes, improvements to existing examples, or documentation enhancements are welcome. Cooky was built by Aldert.

## License

MIT

## Links

- [Pubky.org](https://pubky.org)
- [Pubky App](https://pubky.app)
- [Pubkyring App](https://pubkyring.app)
