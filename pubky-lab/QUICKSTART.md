# 🚀 PubkyLab Quick Start Guide

Get started with PubkyLab in under 5 minutes!

## Method 1: Open Directly (Easiest)

1. Download or clone this repository
2. Open `pubkylab.html` in any modern browser
3. Start testing!

No installation, no build process, no dependencies needed!

## Method 2: Local Development Server

If you want a proper local server:

```bash
# Python (built-in, works everywhere)
python -m http.server 8000

# Then open: http://localhost:8000
```

Or using Node.js:

```bash
# Install http-server globally
npm install -g http-server

# Run server
http-server -p 8000

# Then open: http://localhost:8000
```

## Method 3: Deploy to GitHub Pages (Recommended for sharing)

### Step 1: Create Repository

```bash
# Create a new repository on GitHub
# Then clone it locally
git clone https://github.com/yourusername/pubkylab.git
cd pubkylab
```

### Step 2: Add Files

Copy all project files to the repository:
- `index.html`
- `pubkylab.html`
- `README.md`
- `package.json`
- `vercel.json`
- `LICENSE`
- `.gitignore`
- `.github/workflows/deploy.yml`

### Step 3: Push to GitHub

```bash
git add .
git commit -m "Initial commit: PubkyLab playground"
git push origin main
```

### Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings"
3. Scroll to "Pages" in the sidebar
4. Under "Source", select "GitHub Actions"
5. The workflow will automatically deploy!

Your playground will be live at:
`https://yourusername.github.io/pubkylab/`

## Method 4: Deploy to Vercel (Fastest deployment)

### One-Click Deploy

Click this button:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/pubkylab)

### Or use CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd pubkylab
vercel --prod
```

Done! Vercel will give you a live URL instantly.

## First Steps in PubkyLab

Once you have PubkyLab running:

### 1. Generate User
Click **"Generate New User"** button. You'll see a new public key generated.

### 2. Sign Up
The staging homeserver and invitation code are pre-filled. Just click **"Sign Up"**.

### 3. Write Data
Switch to the **Write** tab:
```
Path: /pub/example.com/test.json
Type: JSON
Content: {"hello": "world", "timestamp": "2025-01-01"}
```
Click **"Write Data"**

### 4. Read Data
Switch to the **Read** tab:
```
Address: /pub/example.com/test.json
Type: JSON
```
Click **"Read Data"**

### 5. Explore More!
- Try listing directories
- Test deleting files
- Check the activity logs
- Experiment with different data types

## Common Issues & Solutions

### Issue: "Module not found" error
**Solution**: Make sure you're using a modern browser that supports ES modules (Chrome 61+, Firefox 60+, Safari 11+, Edge 79+)

### Issue: CORS errors when opening file directly
**Solution**: Use a local server instead (see Method 2)

### Issue: "Invalid invitation code"
**Solution**: The invitation code might have been used up. Contact the Pubky team for a new one.

### Issue: GitHub Pages not deploying
**Solution**: 
1. Check Actions tab for errors
2. Make sure GitHub Pages is enabled in Settings
3. Verify the workflow file is in `.github/workflows/`

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check out the [Pubky SDK documentation](https://pubky.github.io/pubky-core/)
- Join the [Pubky Telegram community](https://t.me/pubkycore)
- Explore the [JavaScript examples](https://github.com/pubky/pubky-core/tree/main/examples/javascript)

## Need Help?

- 📖 [Full Documentation](README.md)
- 💬 [Telegram Community](https://t.me/pubkycore)
- 🐛 [Report Issues](https://github.com/pubky/pubky-core/issues)
- 🌐 [Pubky Website](https://pubky.org)

Happy building! 🎉
