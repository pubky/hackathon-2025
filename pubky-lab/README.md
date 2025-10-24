# 🚀 PubkyLab

An interactive web-based playground for testing and experimenting with the [Pubky SDK](https://github.com/pubky/pubky-core). PubkyLab eliminates setup friction and enables rapid prototyping by providing a visual interface for all SDK operations.

![PubkyLab Screenshot](https://img.shields.io/badge/Status-Live-success)

## 🎯 Problem Statement

Developers need to manually write code and set up environments just to test basic SDK calls, making experimentation slow and preventing quick validation of Pubky concepts.

## ✨ Solution

An interactive web-based playground where developers can instantly test SDK operations (signup, post, get, delete) through a visual interface with real-time results, eliminating setup friction and enabling rapid prototyping.

## 🌟 Features

- **Zero Setup Required** - Works directly in the browser using ES modules
- **Interactive Operations**
  - 🔐 User signup with invitation codes
  - ✍️ Write JSON and text data
  - 📖 Read from public and private storage
  - 📂 List directory contents
  - 🗑️ Delete files
- **Real-time Feedback** - See results instantly with detailed output
- **Activity Logging** - Track all operations with configurable log levels
- **Staging Environment Ready** - Pre-configured with staging homeserver
- **Beautiful UI** - Modern, responsive design with gradient themes

## 🚀 Quick Start

### Option 1: Open Locally

Simply open `pubkylab.html` in a modern web browser (Chrome, Firefox, Safari, Edge). No build process or dependencies required!

```bash
# Clone or download the file
open pubkylab.html
# or
python -m http.server 8000
# Then navigate to http://localhost:8000/pubkylab.html
```

### Option 2: Deploy to GitHub Pages

1. Create a new GitHub repository
2. Upload `pubkylab.html` and `README.md`
3. Go to Settings → Pages
4. Select "main" branch and root directory
5. Save and wait for deployment
6. Access your playground at `https://yourusername.github.io/pubky-lab`

## 📖 Usage Guide

### 1. Generate a New User

Click **"Generate New User"** to create a random keypair. The public key will be displayed.

### 2. Sign Up

- Enter your homeserver public key (obtain from your homeserver provider)
- If required, enter an invitation code
- Click **"Sign Up"** to create your user on the homeserver

### 3. Write Data

Switch to the **Write** tab:
- Enter a path like `/pub/example.com/hello.json`
- Choose content type (JSON or Text)
- Enter your content
- Click **"Write Data"**

### 4. Read Data

Switch to the **Read** tab:
- For your own data, use a relative path: `/pub/example.com/hello.json`
- For public data, use full address: `pubky://[user-pubkey]/pub/example.com/hello.json`
- Choose content type
- Click **"Read Data"**

### 5. List Directory

Switch to the **List** tab:
- Enter a directory path (must end with `/`)
- Set a limit for results
- Click **"List Directory"**

### 6. Delete Data

Switch to the **Delete** tab:
- Enter the path to delete
- Confirm the deletion
- Click **"Delete Data"**

## 🔧 Configuration

### Homeserver Settings

You need to configure the homeserver in the UI:
- **Homeserver Public Key**: Enter the z32 public key of your homeserver
- **Invitation Code**: If your homeserver requires invitation codes, enter it here

Contact your homeserver administrator or provider for these credentials.

### Log Levels

Available log levels (from least to most verbose):
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - General information (default)
- `debug` - Detailed debugging information

## 🏗️ Architecture

PubkyLab is a single-page application built with:
- **Pure HTML/CSS/JavaScript** - No build tools required
- **ES Modules** - Modern JavaScript module system
- **CDN-based SDK** - Loads `@synonymdev/pubky` from jsdelivr
- **Import Maps** - For clean module imports

### Key Technologies

```javascript
// Uses ES module imports
import { Pubky, Keypair, PublicKey, setLogLevel } from '@synonymdev/pubky';

// Instantiate SDK
const pubky = new Pubky();

// Create and sign up user
const keypair = Keypair.random();
const signer = pubky.signer(keypair);
const session = await signer.signup(homeserver, invitationCode);

// Write data
await session.storage.putJson('/pub/app/data.json', { hello: 'world' });
```

## 📦 File Structure

```
pubkylab/
├── pubkylab.html          # Main application (single file)
├── README.md             # This file
└── package.json          # Optional, for Vercel deployment
```

## 🛠️ Development

To contribute or modify PubkyLab:

1. Clone the repository
2. Make your changes to `pubkylab.html`
3. Test locally by opening in a browser
4. Submit a pull request

No build process or dependencies needed!

## 🌐 Deployment Options

### GitHub Pages

**Steps:**
1. Push `pubkylab.html` to your repository
2. Enable GitHub Pages in repository settings
3. Select source branch
4. Access at `https://username.github.io/repo-name/pubkylab.html`

**Pros:**
- Free hosting
- Easy setup
- Good for open source projects

**Cons:**
- Public only
- Limited to static content

### Self-Hosted

Any static file server works:

```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

## 🔐 Security Considerations

- **Keypairs are ephemeral** - Generated in-browser and not stored
- **No backend required** - All operations happen client-side
- **HTTPS recommended** - Use HTTPS in production for secure communication
- **Invitation codes** - Required for user signups on staging

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Ideas for Enhancement

- [ ] Export/import keypairs
- [ ] Recovery file generation
- [ ] Multiple user management
- [ ] Batch operations
- [ ] Public data explorer
- [ ] Code snippets generator
- [ ] Dark mode
- [ ] Authentication flow (pubkyauth) testing
- [ ] Real-time collaboration features

## 📚 Resources

- [Pubky Core Repository](https://github.com/pubky/pubky-core)
- [Pubky Documentation](https://pubky.github.io/pubky-core/)
- [JavaScript SDK on npm](https://www.npmjs.com/package/@synonymdev/pubky)
- [Pubky Website](https://pubky.org)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

Built with ❤️ for the Pubky community.

Special thanks to:
- Pubky Core team for the excellent SDK
- The Pubky community for feedback and support

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/pubky/pubky-core/issues)
- **Discussions**: [GitHub Discussions](https://github.com/pubky/pubky-core/discussions)
- **Telegram**: [Pubky Core Chat](https://t.me/pubkycore)

---

Made by the community, for the community. Happy building! 🚀
