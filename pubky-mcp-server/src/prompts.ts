/**
 * MCP Prompts for common Pubky development tasks
 */

import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export class PromptHandler {
  listPrompts(): Prompt[] {
    return [
      {
        name: 'understand-architecture',
        description: 'Explain the Pubky hub-spoke architecture: where to write (homeserver) vs where to read (Nexus)',
        arguments: [],
      },
      {
        name: 'create-pubky-app',
        description: 'Interactive guide to create a new Pubky application from scratch',
        arguments: [
          {
            name: 'project_name',
            description: 'Name of the project to create',
            required: true,
          },
          {
            name: 'language',
            description: 'Programming language (rust, javascript, typescript)',
            required: false,
          },
          {
            name: 'features',
            description: 'Comma-separated features (auth, storage, json)',
            required: false,
          },
        ],
      },
      {
        name: 'implement-auth',
        description: 'Guide to implement Pubky authentication in your app',
        arguments: [
          {
            name: 'language',
            description: 'Programming language of your project',
            required: true,
          },
        ],
      },
      {
        name: 'add-storage',
        description: 'Guide to add storage operations to your Pubky app (writing to YOUR homeserver)',
        arguments: [
          {
            name: 'language',
            description: 'Programming language of your project',
            required: true,
          },
          {
            name: 'operation',
            description: 'Storage operation (read, write, list, delete)',
            required: false,
          },
        ],
      },
      {
        name: 'write-to-homeserver',
        description: 'Guide for writing data to your homeserver using pubky-app-specs format',
        arguments: [
          {
            name: 'data_type',
            description: 'Type of data to write (post, profile, tag, bookmark)',
            required: true,
          },
          {
            name: 'language',
            description: 'Programming language (javascript, typescript, rust)',
            required: false,
          },
        ],
      },
      {
        name: 'debug-capabilities',
        description: 'Help debug and understand capability/permission issues',
        arguments: [
          {
            name: 'error_message',
            description: "The error message you're seeing",
            required: false,
          },
          {
            name: 'capabilities',
            description: "The capabilities you're using",
            required: false,
          },
        ],
      },
      {
        name: 'setup-testnet',
        description: 'Guide to set up and use local Pubky testnet for development',
        arguments: [],
      },
      {
        name: 'build-social-feed',
        description: 'Guide to build a social feed by reading from Nexus API (aggregated social data)',
        arguments: [
          {
            name: 'language',
            description: 'Programming language (javascript, typescript, rust)',
            required: true,
          },
          {
            name: 'feed_type',
            description: 'Type of feed (following, all, bookmarks)',
            required: false,
          },
        ],
      },
      {
        name: 'read-from-nexus',
        description: 'Guide for reading social data from Nexus indexer (feeds, search, discovery)',
        arguments: [
          {
            name: 'query_type',
            description: 'Type of query (feed, search, user-lookup, post-details)',
            required: true,
          },
          {
            name: 'language',
            description: 'Programming language (javascript, typescript, rust)',
            required: false,
          },
        ],
      },
      {
        name: 'create-post-ui',
        description: 'Guide for creating posts with validation and writing to homeserver',
        arguments: [
          {
            name: 'language',
            description: 'Programming language (javascript, typescript)',
            required: true,
          },
          {
            name: 'post_type',
            description: 'Type of post (short, long, image, video)',
            required: false,
          },
        ],
      },
      {
        name: 'implement-user-profile',
        description: 'Guide for user profile management (writing to homeserver, reading from Nexus)',
        arguments: [
          {
            name: 'language',
            description: 'Programming language (javascript, typescript, rust)',
            required: true,
          },
        ],
      },
      {
        name: 'query-social-data',
        description: 'Guide for querying aggregated social data from Nexus indexer',
        arguments: [
          {
            name: 'data_type',
            description: 'Type of data (posts, users, tags, streams)',
            required: true,
          },
          {
            name: 'language',
            description: 'Programming language (javascript, typescript, rust)',
            required: false,
          },
        ],
      },
      {
        name: 'validate-app-data',
        description: 'Guide for validating data using pubky-app-specs before writing to homeserver',
        arguments: [
          {
            name: 'model',
            description: 'Model to validate (user, post, tag, bookmark, follow)',
            required: true,
          },
        ],
      },
    ];
  }

  async getPrompt(
    name: string,
    args: Record<string, string>
  ): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    switch (name) {
      case 'understand-architecture':
        return this.understandArchitecturePrompt();
      case 'create-pubky-app':
        return this.createPubkyAppPrompt(args);
      case 'implement-auth':
        return this.implementAuthPrompt(args);
      case 'add-storage':
        return this.addStoragePrompt(args);
      case 'write-to-homeserver':
        return this.writeToHomeserverPrompt(args);
      case 'debug-capabilities':
        return this.debugCapabilitiesPrompt(args);
      case 'setup-testnet':
        return this.setupTestnetPrompt();
      case 'build-social-feed':
        return this.buildSocialFeedPrompt(args);
      case 'read-from-nexus':
        return this.readFromNexusPrompt(args);
      case 'create-post-ui':
        return this.createPostUiPrompt(args);
      case 'implement-user-profile':
        return this.implementUserProfilePrompt(args);
      case 'query-social-data':
        return this.querySocialDataPrompt(args);
      case 'validate-app-data':
        return this.validateAppDataPrompt(args);
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }

  private async understandArchitecturePrompt(): Promise<{
    messages: Array<{ role: string; content: { type: string; text: string } }>;
  }> {
    const prompt = `# Understanding Pubky Architecture

Pubky uses a **hub-spoke architecture** where your app interacts with different components for different purposes.

## The Architecture

\`\`\`
        ┌─────────────┐
        │   NEXUS     │ ← Crawls/indexes public data
        │  (Indexer)  │   from all homeservers (~0.5s)
        └─────────────┘
             ▲
             │ GET (read social data)
             │
        ┌────┴────┐
        │  Your   │
        │  App    │
        └────┬────┘
             │
             │ PUT/DELETE (write your data)
             ▼
    ┌─────────────────┐
    │ Your Homeserver │ ← Your personal storage
    └─────────────────┘
\`\`\`

## Three Components

### 1. Your Homeserver (pubky-core)
**WHERE you WRITE data**

- Your personal storage backend
- You authenticate here
- PUT/DELETE operations to store your data
- Example: \`PUT /pub/pubky.app/posts/{id}\`

### 2. Data Specs (pubky-app-specs)
**WHAT format to use**

- Standardized data models (User, Post, Tag, etc.)
- Validation rules for interoperability
- Everyone follows the same format
- Example: PubkyAppPost has max 2000 chars for short posts

### 3. Nexus Indexer (nexus-webapi)
**WHERE you READ social data**

- Aggregates data from ALL homeservers
- Crawls and indexes every ~0.5 seconds
- Fast queries for feeds, search, discovery
- Example: \`GET /v0/stream/following\`

## Data Flow

### Writing Data
1. User creates a post in your app
2. Format it using \`pubky-app-specs\` (PubkyAppPost)
3. \`PUT\` it to YOUR homeserver
4. Nexus automatically discovers and indexes it
5. Other users can now see it via Nexus

### Reading Social Data
1. User wants to see their feed
2. Your app queries Nexus API
3. Nexus returns aggregated, indexed data
4. Fast and efficient (no need to query 100+ homeservers)

## Key Insights

✅ **Write to YOUR homeserver** - Direct, authenticated storage
✅ **Read from NEXUS** - Fast, aggregated social queries  
✅ **Use pubky-app-specs** - Ensures interoperability
❌ **Don't query other homeservers directly** - Too slow for social features

## Example Flow: Creating & Viewing a Post

\`\`\`javascript
// 1. Write to YOUR homeserver
const post = new PubkyAppPost("Hello world!", "short");
await client.put(\`/pub/pubky.app/posts/\${postId}\`, post.toJson());
// Nexus will automatically index this within ~0.5 seconds

// 2. Read from NEXUS for social features
const feed = await nexusClient.get('/v0/stream/following?viewer_id=...');
// Returns posts from all users you follow (aggregated & indexed)
\`\`\`

## Next Steps

- Use \`write-to-homeserver\` prompt to learn about writing data
- Use \`read-from-nexus\` prompt to learn about querying Nexus
- Use \`create-post-ui\` to see a full example

Would you like to explore any specific component in detail?`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  private async createPubkyAppPrompt(
    args: Record<string, string>
  ): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    const projectName = args.project_name || 'my-pubky-app';
    const language = args.language || 'javascript';
    const features = args.features
      ? args.features.split(',').map(f => f.trim())
      : ['auth', 'storage'];

    const prompt = `I'll help you create a new Pubky application called "${projectName}" in ${language}.

## Steps to Create Your Pubky App

### 1. Project Setup

First, let's generate the project scaffold:

Use the \`generate_app_scaffold\` tool with:
- project_name: ${projectName}
- language: ${language}
- features: ${JSON.stringify(features)}

### 2. Install Dependencies

${
  language === 'rust'
    ? `
After the scaffold is created:
\`\`\`bash
cd ${projectName}
cargo build
\`\`\`
`
    : `
After the scaffold is created:
\`\`\`bash
cd ${projectName}
npm install
\`\`\`
`
}

### 3. Set Up Local Testnet (Recommended)

For local development, start a testnet:

Use the \`start_testnet\` tool, or manually:
\`\`\`bash
${language === 'rust' ? 'cargo install pubky-testnet && pubky-testnet' : 'npx pubky-testnet'}
\`\`\`

The testnet homeserver public key is: \`8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo\`

### 4. Update Your Code

${
  language === 'rust'
    ? `
In \`src/main.rs\`, change:
\`\`\`rust
let pubky = Pubky::testnet()?; // For local development
// let pubky = Pubky::new()?; // For production
\`\`\`
`
    : `
In your main file, change:
\`\`\`javascript
const pubky = Pubky.testnet(); // For local development
// const pubky = new Pubky(); // For production
\`\`\`
`
}

### 5. Run Your App

\`\`\`bash
${language === 'rust' ? 'cargo run' : 'npm start'}
\`\`\`

## What Features Are Included?

${
  features.includes('auth')
    ? `
### Authentication
Your app includes Pubky Auth flow for keyless authentication. Users can scan a QR code with their Pubky authenticator (like Pubky Ring app).
`
    : ''
}

${
  features.includes('storage')
    ? `
### Storage
Your app can read and write to the user's Pubky homeserver storage. All storage operations are under \`/pub/my-app/\` by default.
`
    : ''
}

${
  features.includes('json')
    ? `
### JSON Support
Your app includes JSON serialization helpers for easy data handling.
`
    : ''
}

## Next Steps

1. Explore the generated code
2. Read the README.md in your project
3. Check out more examples with \`get_code_example\`
4. Learn about capabilities with \`explain_capabilities\`

Need help with anything? Just ask!`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a new Pubky app called "${projectName}" in ${language}`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  private async implementAuthPrompt(
    args: Record<string, string>
  ): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    const language = args.language || 'javascript';

    const prompt = `I'll help you implement Pubky authentication in your ${language} app.

## Pubky Authentication Flow

Pubky uses a QR code-based authentication flow that allows users to sign in with their Pubky identity (like Pubky Ring app) without exposing their keys to your app.

### How It Works

1. **Your App**: Generates an authorization URL with required capabilities
2. **User**: Scans the URL (QR code) with their Pubky authenticator
3. **Authenticator**: Shows what permissions your app is requesting
4. **User**: Approves or denies
5. **Your App**: Receives a session with the approved capabilities

### Implementation

${
  language === 'rust'
    ? `
\`\`\`rust
use pubky::prelude::*;

#[tokio::main]
async fn main() -> pubky::Result<()> {
    let pubky = Pubky::testnet()?; // or Pubky::new() for production
    
    // Define what your app needs access to
    let caps = Capabilities::builder()
        .read_write("/pub/my-app/")     // Full access to your app's directory
        .read("/pub/pubky.app/profile") // Read-only access to user's profile
        .finish();
    
    // Start the auth flow
    let flow = pubky.start_auth_flow(&caps)?;
    
    println!("Scan this URL:");
    println!("{}", flow.authorization_url());
    
    // In a web app, you'd show this as a QR code
    // For testing, you can copy-paste to the authenticator
    
    // Wait for user approval (this will block until user approves/denies)
    let session = flow.await_approval().await?;
    
    println!("✅ Authenticated!");
    println!("User: {}", session.info().public_key());
    
    // Now you can use the session to access storage
    session.storage()
        .put("/pub/my-app/data.json", r#"{"welcome": true}"#)
        .await?;
    
    Ok(())
}
\`\`\`
`
    : `
\`\`\`javascript
import { Pubky, Capabilities } from '@synonymdev/pubky';

const pubky = Pubky.testnet(); // or new Pubky() for production

// Define what your app needs access to
const caps = Capabilities.builder()
  .readWrite('/pub/my-app/')      // Full access to your app's directory
  .read('/pub/pubky.app/profile') // Read-only access to user's profile
  .finish();

// Start the auth flow
const flow = pubky.startAuthFlow(caps);

// Show the authorization URL as a QR code
console.log('Scan this QR code:');
console.log(flow.authorizationUrl());

// In a web app, you might use a QR code library:
// import QRCode from 'qrcode';
// QRCode.toDataURL(flow.authorizationUrl());

// Wait for user approval
const session = await flow.awaitApproval();

console.log('✅ Authenticated!');
console.log('User:', session.publicKey());

// Now you can use the session
await session.storage().put('/pub/my-app/data.json', JSON.stringify({ welcome: true }));
\`\`\`
`
}

### Key Points

1. **Capabilities**: Be specific about what you need. Don't request \`/:rw\` (everything) unless absolutely necessary.

2. **QR Codes**: In a web app, convert the authorization URL to a QR code for easy scanning.

3. **Session Management**: Store the session for subsequent requests. ${language === 'rust' ? 'You can persist it with `session.write_secret_file()`.' : 'You can save it to a file or database.'}

4. **Testnet**: For development, use Pubky.testnet() and start a local testnet with \`start_testnet\` tool.

### Testing Authentication

1. Start your local testnet (if not already running)
2. Run your app
3. Use an authenticator app (Pubky Ring) or the CLI authenticator
4. Scan/paste the auth URL
5. Approve the capabilities
6. Your app receives the session!

### Common Issues

- **Timeout**: Make sure your HTTP relay is accessible
- **No Approval**: Check that the authenticator has the correct homeserver configured
- **401 Errors**: Verify the session is being sent with requests

Need help with a specific part? Just ask!`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `How do I implement Pubky authentication in my ${language} app?`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  private async addStoragePrompt(
    args: Record<string, string>
  ): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    const language = args.language || 'javascript';
    const operation = args.operation || 'all';

    const prompt = `I'll help you add storage operations to your Pubky app in ${language}.

## Pubky Storage Overview

Pubky provides a simple key-value storage API via HTTP. There are two types of storage access:

1. **Session Storage**: Authenticated access to your own or authorized storage
2. **Public Storage**: Read-only access to anyone's public data

### Path Conventions

- \`/pub/*\` - Public data (readable by anyone)
- \`/pub/my-app/*\` - Your app's public data
- Other paths may be restricted or private

${
  operation === 'write' || operation === 'all'
    ? `
### Writing Data

${
  language === 'rust'
    ? `
\`\`\`rust
use pubky::prelude::*;

async fn write_data(session: &PubkySession) -> pubky::Result<()> {
    // Write text
    session.storage()
        .put("/pub/my-app/hello.txt", "Hello, World!")
        .await?;
    
    // Write JSON (with feature "json")
    #[cfg(feature = "json")]
    {
        use serde::{Serialize, Deserialize};
        
        #[derive(Serialize)]
        struct Profile {
            name: String,
            bio: String,
        }
        
        let profile = Profile {
            name: "Alice".to_string(),
            bio: "Pubky developer".to_string(),
        };
        
        session.storage()
            .put_json("/pub/my-app/profile.json", &profile)
            .await?;
    }
    
    // Write binary data
    let image_bytes = std::fs::read("avatar.png")?;
    session.storage()
        .put("/pub/my-app/avatar.png", image_bytes)
        .await?;
    
    Ok(())
}
\`\`\`
`
    : `
\`\`\`javascript
async function writeData(session) {
  // Write text
  await session.storage().put('/pub/my-app/hello.txt', 'Hello, World!');
  
  // Write JSON
  const profile = {
    name: 'Alice',
    bio: 'Pubky developer'
  };
  await session.storage().put('/pub/my-app/profile.json', JSON.stringify(profile));
  
  // Write binary data (in browser)
  const file = document.getElementById('fileInput').files[0];
  const arrayBuffer = await file.arrayBuffer();
  await session.storage().put('/pub/my-app/avatar.png', arrayBuffer);
}
\`\`\`
`
}
`
    : ''
}

${
  operation === 'read' || operation === 'all'
    ? `
### Reading Data (Authenticated)

${
  language === 'rust'
    ? `
\`\`\`rust
async fn read_data(session: &PubkySession) -> pubky::Result<()> {
    // Read text
    let response = session.storage()
        .get("/pub/my-app/hello.txt")
        .await?;
    let text = response.text().await?;
    println!("Content: {}", text);
    
    // Read JSON (with feature "json")
    #[cfg(feature = "json")]
    {
        let profile: Profile = session.storage()
            .get_json("/pub/my-app/profile.json")
            .await?;
        println!("Name: {}", profile.name);
    }
    
    // Read binary
    let response = session.storage()
        .get("/pub/my-app/avatar.png")
        .await?;
    let bytes = response.bytes().await?;
    
    Ok(())
}
\`\`\`
`
    : `
\`\`\`javascript
async function readData(session) {
  // Read text
  const response = await session.storage().get('/pub/my-app/hello.txt');
  const text = await response.text();
  console.log('Content:', text);
  
  // Read JSON
  const profileResponse = await session.storage().get('/pub/my-app/profile.json');
  const profile = JSON.parse(await profileResponse.text());
  console.log('Name:', profile.name);
  
  // Read binary
  const imageResponse = await session.storage().get('/pub/my-app/avatar.png');
  const blob = await imageResponse.blob();
  // Use blob in browser, e.g., create object URL for <img>
  const url = URL.createObjectURL(blob);
}
\`\`\`
`
}

### Reading Public Data (No Authentication Required)

${
  language === 'rust'
    ? `
\`\`\`rust
async fn read_public_data(pubky: &Pubky, user_pk: &PublicKey) -> pubky::Result<()> {
    let public_storage = pubky.public_storage();
    
    // Read a file
    let response = public_storage
        .get(format!("pubky{}/pub/my-app/profile.json", user_pk))
        .await?;
    let text = response.text().await?;
    
    // List files in a directory
    let entries = public_storage
        .list(format!("pubky{}/pub/my-app/", user_pk))?
        .limit(10)
        .send()
        .await?;
    
    for entry in entries {
        println!("- {}", entry.path);
    }
    
    Ok(())
}
\`\`\`
`
    : `
\`\`\`javascript
async function readPublicData(pubky, userPublicKey) {
  const publicStorage = pubky.publicStorage();
  
  // Read a file
  const response = await publicStorage.get(\`pubky\${userPublicKey}/pub/my-app/profile.json\`);
  const profile = JSON.parse(await response.text());
  
  // List files in a directory
  const entries = await publicStorage
    .list(\`pubky\${userPublicKey}/pub/my-app/\`)
    .limit(10)
    .send();
  
  for (const entry of entries) {
    console.log('-', entry.path);
  }
}
\`\`\`
`
}
`
    : ''
}

${
  operation === 'list' || operation === 'all'
    ? `
### Listing Files

${
  language === 'rust'
    ? `
\`\`\`rust
// List with session
let entries = session.storage()
    .list("/pub/my-app/")?
    .limit(20)
    .send()
    .await?;

for entry in entries {
    println!("{} - {} bytes", entry.path, entry.size);
}
\`\`\`
`
    : `
\`\`\`javascript
// List with session
const entries = await session.storage()
  .list('/pub/my-app/')
  .limit(20)
  .send();

for (const entry of entries) {
  console.log(\`\${entry.path} - \${entry.size} bytes\`);
}
\`\`\`
`
}
`
    : ''
}

${
  operation === 'delete' || operation === 'all'
    ? `
### Deleting Files

${
  language === 'rust'
    ? `
\`\`\`rust
session.storage()
    .delete("/pub/my-app/old-data.json")
    .await?;
\`\`\`
`
    : `
\`\`\`javascript
await session.storage().delete('/pub/my-app/old-data.json');
\`\`\`
`
}
`
    : ''
}

### Best Practices

1. **Organize Your Data**: Use a consistent directory structure like \`/pub/my-app/users/{userId}/...\`

2. **Handle Errors**: Always handle cases where files don't exist (404) or operations fail

3. **Size Limits**: Files are limited to 100MB by default on homeservers

4. **Capabilities**: Make sure your session has the right capabilities (\`read\` for GET, \`write\` for PUT/DELETE)

5. **Caching**: Consider caching frequently accessed data

Need more help? Use \`get_code_example\` for full examples!`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `How do I add storage operations to my Pubky app?`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  private async writeToHomeserverPrompt(
    args: Record<string, string>
  ): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    const dataType = args.data_type || 'post';
    const language = args.language || 'javascript';

    const prompt = `# Writing to Your Homeserver

I'll guide you through writing ${dataType} data to YOUR homeserver using the pubky-app-specs format.

## Key Concept

When you write data to your homeserver:
1. Format it using **pubky-app-specs** (ensures interoperability)
2. **PUT** it to YOUR homeserver with proper authentication
3. Nexus will automatically discover and index it within ~0.5 seconds
4. Other users can then read it via Nexus API

## Example: Writing a ${dataType.charAt(0).toUpperCase() + dataType.slice(1)}

Use the \`generate_data_model\` tool to get the proper format:
- model: ${dataType}
- language: ${language}

Then use \`create_model_example\` to see a complete working example.

## General Pattern

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${language === 'rust' ? `
// 1. Create and validate data
let data = PubkyApp${dataType.charAt(0).toUpperCase() + dataType.slice(1)}::new(...);
data.validate()?;

// 2. Create path
let id = data.create_id();
let path = PubkyApp${dataType.charAt(0).toUpperCase() + dataType.slice(1)}::create_path(&id);

// 3. Authenticate and write
let client = Pubky::builder()
    .homeserver(homeserver_url)
    .build()?;
client.signin(capabilities).await?;
client.put(&path, &serde_json::to_vec(&data)?).await?;
` : `
// 1. Create and validate data
const builder = new PubkySpecsBuilder(userId);
const { ${dataType}, meta } = builder.create${dataType.charAt(0).toUpperCase() + dataType.slice(1)}(...);

// 2. Authenticate
const client = new Pubky();
await client.signup(capabilities);

// 3. Write to homeserver
await client.put(meta.url, ${dataType}.toJson());
`}
\`\`\`

## Important Notes

✅ **Write to YOUR homeserver** - Not to Nexus!
✅ **Use pubky-app-specs format** - For interoperability
✅ **Store in /pub/pubky.app/** - So Nexus can index it
✅ **Authenticate first** - Need valid session
❌ **Don't write to Nexus** - It only reads/indexes

## Next Steps

1. Use \`generate_data_model\` to get the proper ${dataType} format
2. Use \`create_model_example\` to see a full example
3. Use \`implement-auth\` if you need help with authentication
4. Use \`add-storage\` for more storage operation examples

Want me to show you a complete example with authentication?`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Guide me through writing ${dataType} data to my homeserver in ${language}`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  private async debugCapabilitiesPrompt(
    args: Record<string, string>
  ): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    const errorMessage = args.error_message || '';
    const capabilities = args.capabilities || '';

    const prompt = `I'll help you debug capability/permission issues in your Pubky app.

${errorMessage ? `## Error Analysis\n\nYou're seeing: "${errorMessage}"\n\n` : ''}
${capabilities ? `## Your Capabilities\n\nYou're using: \`${capabilities}\`\n\n` : ''}

## Common Capability Issues

### 1. 401 Unauthorized
**Problem**: No session or invalid session cookie
**Solution**: 
- Make sure you've called \`signin()\` or \`signup()\` first
- Verify the session cookie is being sent with requests
- Check that the session hasn't expired

### 2. 403 Forbidden
**Problem**: Session exists but lacks required capabilities
**Solution**:
- Review your capabilities - do they cover the path you're accessing?
- Example: If you're writing to \`/pub/my-app/data.json\`, you need \`/pub/my-app/:w\` or \`/:w\`
- Use \`explain_capabilities\` tool to understand what your capabilities grant

### 3. Capability Scope Rules

**Exact Match**: \`/pub/my-app/file.txt:r\` - Only this specific file
**Directory Match**: \`/pub/my-app/:r\` - All files under /pub/my-app/ (note the trailing /)
**Root Match**: \`/:rw\` - Everything (use cautiously!)

### 4. Read vs Write

- \`:r\` - Read only (GET, HEAD)
- \`:w\` - Write only (PUT, POST, DELETE)
- \`:rw\` - Both read and write

### 5. Capability Best Practices

✅ **DO**:
- Be specific: \`/pub/my-app/:rw\` instead of \`/:rw\`
- Request minimum needed permissions
- Use read-only (\`:r\`) when possible

❌ **DON'T**:
- Request \`/:rw\` unless you really need everything
- Mix path specificity unnecessarily
- Forget the trailing \`/\` for directory access

## Debugging Steps

1. **Check your capabilities**:
   Use \`explain_capabilities\` tool with your capability string

2. **Verify the path**:
   Does your capability scope cover the path you're accessing?
   - Accessing: \`/pub/my-app/data/file.json\`
   - Capability: \`/pub/my-app/:rw\` ✅
   - Capability: \`/pub/other-app/:rw\` ❌

3. **Check the action**:
   - Reading? Need \`:r\` or \`:rw\`
   - Writing/Deleting? Need \`:w\` or \`:rw\`

4. **Test with broader permissions**:
   Try \`/:rw\` temporarily to see if it's a capability issue
   If it works, narrow down to the specific scope you need

5. **Check session validity**:
   Make sure you're authenticated and the session is active

## Example Fix

**Problem**: Getting 403 when writing to \`/pub/my-app/posts/123.json\`

**Original Capability**: \`/pub/my-app:rw\` (no trailing slash!)

**Fix**: \`/pub/my-app/:rw\` (with trailing slash for directory matching)

Or more specific: \`/pub/my-app/posts/:rw\`

${capabilities ? `\n## Analysis of Your Capabilities\n\nUse the \`explain_capabilities\` tool with your capability string to get detailed information.\n` : ''}

Need more help? Share your code and I can take a closer look!`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Help me debug capability issues${errorMessage ? `: ${errorMessage}` : ''}`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  private async setupTestnetPrompt(): Promise<{
    messages: Array<{ role: string; content: { type: string; text: string } }>;
  }> {
    const prompt = `I'll help you set up a local Pubky testnet for development.

## Why Use a Local Testnet?

- **Offline Development**: No internet required
- **Fast Iteration**: Instant resets, no rate limits
- **Free**: No costs for storage or operations
- **Safe Testing**: Experiment without affecting production data

## Setup Steps

### 1. Install pubky-testnet

**Option A: Using Cargo** (Recommended)
\`\`\`bash
cargo install pubky-testnet
\`\`\`

**Option B: From Source**
\`\`\`bash
cd /path/to/pubky-core
cargo build -p pubky-testnet --release
\`\`\`

Or use the MCP tool:
\`\`\`
Use the \`install_pubky_testnet\` tool
\`\`\`

### 2. Start the Testnet

**If installed via cargo:**
\`\`\`bash
pubky-testnet
\`\`\`

**Or use the MCP tool:**
\`\`\`
Use the \`start_testnet\` tool
\`\`\`

### 3. Testnet Information

Once running, you'll have:

- **Homeserver Public Key**: \`8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo\`
- **DHT Port**: 6881
- **Pkarr Relay Port**: 15411
- **HTTP Relay Port**: 15412
- **Admin Server Port**: 6288

**URLs**:
- Homeserver: http://localhost:15411
- HTTP Relay: http://localhost:15412
- Admin: http://localhost:6288

### 4. Update Your Code

**Rust**:
\`\`\`rust
// Instead of:
// let pubky = Pubky::new()?;

// Use:
let pubky = Pubky::testnet()?;
\`\`\`

**JavaScript**:
\`\`\`javascript
// Instead of:
// const pubky = new Pubky();

// Use:
const pubky = Pubky.testnet();
\`\`\`

### 5. Test It!

Run your app and it will connect to your local testnet instead of production servers.

## Managing the Testnet

**Check Status**:
\`\`\`
Use \`check_testnet_status\` tool
\`\`\`

**Get Info**:
\`\`\`
Use \`get_testnet_info\` tool
\`\`\`

**Stop**:
\`\`\`
Use \`stop_testnet\` tool
\`\`\`
Or press Ctrl+C if running in terminal

**Restart**:
\`\`\`
Use \`restart_testnet\` tool
\`\`\`

## Testnet Features

1. **Ephemeral**: Data is lost when stopped (perfect for testing!)
2. **No Signup Tokens**: Signup is open, no invitation needed
3. **Hardcoded Keys**: Same homeserver key every time
4. **Local Only**: Not accessible from outside your machine

## Common Use Cases

### Development Workflow
1. Start testnet at beginning of day
2. Develop and test your app
3. Stop testnet when done
4. Next day: start fresh!

### CI/CD Testing
\`\`\`bash
# In your CI script
pubky-testnet &
TESTNET_PID=$!

# Run your tests
npm test

# Clean up
kill $TESTNET_PID
\`\`\`

### Multiple Projects
You can run one testnet and use it for multiple projects simultaneously!

## Troubleshooting

**Port Already in Use**:
Something else is running on the required ports. Stop other services or change ports.

**Can't Connect**:
Make sure testnet is running (\`check_testnet_status\` tool) and you're using \`Pubky.testnet()\`.

**Data Disappeared**:
That's expected! Testnet is ephemeral. For persistent data, use a real homeserver.

Ready to develop? Start your testnet and begin building!`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'How do I set up a local Pubky testnet?',
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  private async buildSocialFeedPrompt(
    args: Record<string, string>
  ): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    const language = args.language || 'javascript';
    const feedType = args.feed_type || 'following';

    const prompt = `I'll help you build a social feed using the Nexus API in ${language}.

## Understanding Social Feeds

The Nexus API provides powerful endpoints for building social feeds with Web-of-Trust filtering:

- **All Posts**: Global timeline of all posts
- **Following**: Posts from users you follow
- **Followers**: Posts from your followers
- **Friends**: Posts from mutual follows
- **Bookmarks**: Your saved posts

## Implementation Steps

### 1. Set Up Nexus Client

${
  language === 'javascript' || language === 'typescript'
    ? `\`\`\`${language}
const NEXUS_API_URL = 'https://nexus.example.com';

async function fetchFeed(source = '${feedType}', observerId, options = {}) {
  const params = new URLSearchParams({
    source,
    observer_id: observerId,
    limit: options.limit || 20,
    skip: options.skip || 0,
    sorting: options.sorting || 'timeline',
    ...options
  });

  const response = await fetch(\`\${NEXUS_API_URL}/v0/stream/posts?\${params}\`);
  if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
  
  return await response.json();
}
\`\`\`
`
    : `\`\`\`rust
use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct PostView {
    details: PostDetails,
    counts: PostCounts,
    tags: Vec<TagDetails>,
    // ... other fields
}

async fn fetch_feed(
    source: &str,
    observer_id: &str,
    limit: u32,
) -> Result<Vec<PostView>, reqwest::Error> {
    let url = format!(
        "https://nexus.example.com/v0/stream/posts?source={}&observer_id={}&limit={}",
        source, observer_id, limit
    );
    
    reqwest::get(&url).await?.json().await
}
\`\`\`
`
}

### 2. Fetch and Display Posts

${
  language === 'javascript' || language === 'typescript'
    ? `\`\`\`${language}
// Fetch posts for the feed
const posts = await fetchFeed('${feedType}', userId, {
  limit: 20,
  sorting: 'timeline', // or 'total_engagement'
  kind: 'short', // optional: filter by post type
});

// Display posts
posts.forEach(post => {
  console.log(\`Post by \${post.details.author}:\`);
  console.log(post.details.content);
  console.log(\`❤️ \${post.counts.tags} | 💬 \${post.counts.replies} | 🔄 \${post.counts.reposts}\`);
  console.log('---');
});
\`\`\`
`
    : `\`\`\`rust
let posts = fetch_feed("${feedType}", &user_id, 20).await?;

for post in posts {
    println!("Post by {}", post.details.author);
    println!("{}", post.details.content);
    println!("❤️ {} | 💬 {} | 🔄 {}", 
        post.counts.tags, 
        post.counts.replies, 
        post.counts.reposts
    );
    println!("---");
}
\`\`\`
`
}

### 3. Implement Pagination

${
  language === 'javascript' || language === 'typescript'
    ? `\`\`\`${language}
let skip = 0;
const limit = 20;

async function loadMore() {
  const morePosts = await fetchFeed('${feedType}', userId, { skip, limit });
  skip += limit;
  return morePosts;
}
\`\`\`
`
    : `\`\`\`rust
let mut skip = 0;
let limit = 20;

async fn load_more(observer_id: &str, skip: &mut u32) -> Result<Vec<PostView>, reqwest::Error> {
    let posts = fetch_feed_with_pagination("${feedType}", observer_id, *skip, limit).await?;
    *skip += limit;
    Ok(posts)
}
\`\`\`
`
}

### 4. Add Real-time Updates (Optional)

Use the Nexus event stream to get live updates:

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `// WebSocket or polling implementation for real-time updates
// Check Nexus API docs for SSE endpoint`
    : `const eventSource = new EventSource(\`\${NEXUS_API_URL}/v0/events/?cursor=\${lastTimestamp}\`);

eventSource.onmessage = (event) => {
  const newPost = JSON.parse(event.data);
  // Add to feed if it matches your criteria
  prependPost(newPost);
};`
}
\`\`\`

## Advanced Features

### Filter by Tags

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `let posts = fetch_feed_with_tags("following", &user_id, &["bitcoin", "nostr"]).await?;`
    : `const posts = await fetchFeed('following', userId, {
  tags: 'bitcoin,nostr'
});`
}
\`\`\`

### Filter by Post Kind

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `// Filter for only image posts
let posts = fetch_feed_by_kind("following", &user_id, "image").await?;`
    : `// Filter for only video posts
const posts = await fetchFeed('following', userId, {
  kind: 'video'
});`
}
\`\`\`

### Time-based Queries

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `// Get posts from last 24 hours
let day_ago = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() - 86400;
let posts = fetch_feed_since("all", day_ago).await?;`
    : `// Get posts from last 24 hours  
const dayAgo = Date.now() - 86400000;
const posts = await fetchFeed('all', userId, {
  end: dayAgo
});`
}
\`\`\`

## Best Practices

1. **Pagination**: Always implement pagination for large feeds
2. **Caching**: Cache post data locally to reduce API calls
3. **Error Handling**: Handle 404 (no posts) and 500 (server error) gracefully
4. **Loading States**: Show loading indicators while fetching
5. **Web-of-Trust**: Use \`observer_id\` to get personalized feeds

## Next Steps

- Use \`query_nexus_api\` tool to explore more endpoints
- Use \`explain_nexus_endpoint\` for detailed API documentation
- Check \`pubky://api/nexus/schemas\` for complete data structures

Need help with a specific part? Just ask!`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `How do I build a ${feedType} feed in ${language}?`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  private async readFromNexusPrompt(
    args: Record<string, string>
  ): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    const queryType = args.query_type || 'feed';
    const language = args.language || 'javascript';

    const prompt = `# Reading from Nexus Indexer

I'll guide you through querying social data from the Nexus indexer.

## Key Concept

Nexus is an **indexer** that:
- Crawls ALL homeservers every ~0.5 seconds
- Indexes public data (stored in /pub/pubky.app/)
- Provides fast, aggregated queries for social features
- You READ from Nexus, never WRITE to it

## Why Use Nexus?

**Without Nexus:** To show a feed, you'd need to:
- Query homeserver 1 for User A's posts
- Query homeserver 2 for User B's posts
- Query homeserver 3 for User C's posts
- ... 100+ HTTP requests! 🐌

**With Nexus:** Single query → instant results ⚡

## Query Type: ${queryType.toUpperCase()}

Use the \`query_nexus_api\` tool to find relevant endpoints:
- query: "${queryType}"

Then use \`explain_nexus_endpoint\` for detailed examples.

## Common Queries

### 1. Get Feed (Following)
\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${language === 'rust' ? `
let url = format!("{}/v0/stream/following?viewer_id={}&skip=0&limit=20", NEXUS_URL, viewer_id);
let response = client.get(&url).send().await?;
let posts: Vec<PostView> = response.json().await?;
` : `
const response = await fetch(
  \`\${NEXUS_URL}/v0/stream/following?viewer_id=\${viewerId}&skip=0&limit=20\`
);
const posts = await response.json();
`}
\`\`\`

### 2. Search Users
\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${language === 'rust' ? `
let url = format!("{}/v0/search/users?query={}&skip=0&limit=10", NEXUS_URL, search_term);
let response = client.get(&url).send().await?;
let users: Vec<UserView> = response.json().await?;
` : `
const response = await fetch(
  \`\${NEXUS_URL}/v0/search/users?query=\${searchTerm}&skip=0&limit=10\`
);
const users = await response.json();
`}
\`\`\`

### 3. Get Post Details
\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${language === 'rust' ? `
let url = format!("{}/v0/post/{}/{}", NEXUS_URL, author_id, post_id);
let response = client.get(&url).send().await?;
let post: PostView = response.json().await?;
` : `
const response = await fetch(\`\${NEXUS_URL}/v0/post/\${authorId}/\${postId}\`);
const post = await response.json();
`}
\`\`\`

### 4. Get User Profile
\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${language === 'rust' ? `
let url = format!("{}/v0/user/{}", NEXUS_URL, user_id);
let response = client.get(&url).send().await?;
let user: UserView = response.json().await?;
` : `
const response = await fetch(\`\${NEXUS_URL}/v0/user/\${userId}\`);
const user = await response.json();
`}
\`\`\`

## Important Notes

✅ **Read from NEXUS** - For social features
✅ **No authentication needed** - Public data
✅ **Fast queries** - Pre-indexed data
✅ **Pagination support** - Use skip/limit
❌ **Don't write to Nexus** - Write to homeserver instead

## Nexus URL

- **Production**: \`https://nexus.pubky.app\`
- **Local testnet**: Check with \`get_testnet_info\` tool

## Generate Full Client

Use \`generate_nexus_client\` tool to generate a complete API client:
- language: ${language}
- endpoints: [leave empty for common ones]

## Next Steps

1. Use \`query_nexus_api\` to explore available endpoints
2. Use \`generate_nexus_client\` to generate a full client
3. Use \`build-social-feed\` for a complete feed implementation

Want me to show you a complete example with pagination and error handling?`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Show me how to query ${queryType} data from Nexus in ${language}`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  private async createPostUiPrompt(
    args: Record<string, string>
  ): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    const language = args.language || 'javascript';
    const postType = args.post_type || 'short';

    const prompt = `I'll help you create a post UI with validation in ${language}.

## Understanding Post Models

Pubky app uses structured post models with validation:

- **short**: Up to 2,000 characters
- **long**: Up to 50,000 characters  
- **image**: Post with image attachments
- **video**: Post with video attachments
- **link**: Post with embedded link
- **file**: Post with file attachments

## Implementation Steps

### 1. Install Dependencies

\`\`\`bash
npm install pubky-app-specs
\`\`\`

### 2. Create Post with Validation

\`\`\`${language}
import { PubkySpecsBuilder, PubkyAppPostKind } from 'pubky-app-specs';

const userId = 'your-pubky-id';
const specsBuilder = new PubkySpecsBuilder(userId);

// Create a ${postType} post
function createPost(content${postType === 'image' || postType === 'video' || postType === 'file' ? ', attachments = []' : ''}) {
  // Validate content length
  const maxLength = ${postType === 'long' ? '50000' : '2000'};
  if (content.length > maxLength) {
    throw new Error(\`Content exceeds maximum length of \${maxLength} characters\`);
  }

  // Create post with validation
  const { post, meta } = specsBuilder.createPost(
    content,
    PubkyAppPostKind.${postType.charAt(0).toUpperCase() + postType.slice(1)},
    null,  // parent (for replies)
    null,  // embed (for reposts)
    ${postType === 'image' || postType === 'video' || postType === 'file' ? 'attachments' : 'null'}
  );

  return { post, meta };
}
\`\`\`

### 3. Build the UI Form

${
  language === 'typescript'
    ? `\`\`\`tsx
import React, { useState } from 'react';
import { PubkySpecsBuilder, PubkyAppPostKind } from 'pubky-app-specs';

export function CreatePostForm({ userId, onPostCreated }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxLength = ${postType === 'long' ? 50000 : 2000};
  const remaining = maxLength - content.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (content.trim().length === 0) {
      setError('Content cannot be empty');
      return;
    }

    if (content.length > maxLength) {
      setError(\`Content exceeds maximum length of \${maxLength} characters\`);
      return;
    }

    setIsSubmitting(true);

    try {
      const specsBuilder = new PubkySpecsBuilder(userId);
      const { post, meta } = specsBuilder.createPost(
        content,
        PubkyAppPostKind.${postType.charAt(0).toUpperCase() + postType.slice(1)},
        null,
        null,
        null
      );

      // Store to Pubky (using your storage session)
      await session.storage().put(meta.url, post.toJson());

      setContent('');
      onPostCreated({ post, meta });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-post-form">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={${postType === 'long' ? 10 : 4}}
        maxLength={maxLength}
      />
      
      <div className="form-footer">
        <span className={remaining < 100 ? 'warning' : ''}>
          {remaining} characters remaining
        </span>
        
        <button 
          type="submit" 
          disabled={isSubmitting || content.trim().length === 0}
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}
    </form>
  );
}
\`\`\`
`
    : `\`\`\`javascript
// Create a simple form
const form = document.createElement('form');
form.innerHTML = \`
  <textarea 
    id="postContent" 
    placeholder="What's on your mind?"
    rows="${postType === 'long' ? 10 : 4}"
    maxlength="${postType === 'long' ? 50000 : 2000}"
  ></textarea>
  <div>
    <span id="charCount">0 / ${postType === 'long' ? '50000' : '2000'}</span>
    <button type="submit">Post</button>
  </div>
  <div id="error" style="color: red;"></div>
\`;

const textarea = form.querySelector('#postContent');
const charCount = form.querySelector('#charCount');
const errorDiv = form.querySelector('#error');

// Update character count
textarea.addEventListener('input', () => {
  charCount.textContent = \`\${textarea.value.length} / ${postType === 'long' ? '50000' : '2000'}\`;
});

// Handle submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorDiv.textContent = '';

  const content = textarea.value.trim();
  if (!content) {
    errorDiv.textContent = 'Content cannot be empty';
    return;
  }

  try {
    const specsBuilder = new PubkySpecsBuilder(userId);
    const { post, meta } = specsBuilder.createPost(
      content,
      PubkyAppPostKind.${postType.charAt(0).toUpperCase() + postType.slice(1)},
      null,
      null,
      null
    );

    // Store to Pubky
    await session.storage().put(meta.url, JSON.stringify(post.toJson()));

    textarea.value = '';
    alert('Post created!');
  } catch (err) {
    errorDiv.textContent = err.message;
  }
});
\`\`\`
`
}

${
  postType === 'image' || postType === 'video' || postType === 'file'
    ? `
### 4. Handle File Uploads

\`\`\`${language}
${
  language === 'typescript'
    ? `async function uploadFile(file: File, userId: string, session: PubkySession) {
  // Create blob
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  const specsBuilder = new PubkySpecsBuilder(userId);
  const { blob, meta: blobMeta } = specsBuilder.createBlob(Array.from(bytes));
  
  // Upload blob
  await session.storage().put(blobMeta.url, arrayBuffer);
  
  // Create file metadata
  const { file: fileMetadata, meta: fileMeta } = specsBuilder.createFile(
    file.name,
    blobMeta.url,
    file.type,
    file.size
  );
  
  // Store file metadata
  await session.storage().put(fileMeta.url, fileMetadata.toJson());
  
  return fileMeta.url; // Return for use in post attachments
}`
    : `async function uploadFile(file, userId, session) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  const specsBuilder = new PubkySpecsBuilder(userId);
  const { blob, meta: blobMeta } = specsBuilder.createBlob(Array.from(bytes));
  
  await session.storage().put(blobMeta.url, arrayBuffer);
  
  const { file: fileMetadata, meta: fileMeta } = specsBuilder.createFile(
    file.name,
    blobMeta.url,
    file.type,
    file.size
  );
  
  await session.storage().put(fileMeta.url, JSON.stringify(fileMetadata.toJson()));
  
  return fileMeta.url;
}`
}
\`\`\`
`
    : ''
}

## Validation Rules

The specs automatically validate:
- ✅ Content length (${postType === 'long' ? '50,000' : '2,000'} chars max)
- ✅ Reserved keyword "[DELETED]" not allowed
- ✅ Valid URI format for parent/embed
- ✅ Post kind enum validation

## Best Practices

1. **Real-time Validation**: Show character count and errors as user types
2. **Sanitization**: Content is automatically trimmed and sanitized
3. **Error Handling**: Display validation errors clearly to users
4. **Loading States**: Disable submit button while posting
5. **Success Feedback**: Show confirmation after successful post

## Next Steps

- Use \`explain_model\` tool for detailed post model docs
- Use \`create_model_example\` for more examples
- Query created posts with \`query_nexus_api\`

Need help with replies or reposts? Just ask!`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `How do I create a ${postType} post UI with validation?`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  private async implementUserProfilePrompt(
    args: Record<string, string>
  ): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    const language = args.language || 'javascript';

    const prompt = `I'll help you implement user profile management in ${language}.

## User Profile Structure

Pubky user profiles include:
- **name**: 3-50 characters (required)
- **bio**: Up to 160 characters
- **image**: Profile picture URL
- **links**: Up to 5 social links
- **status**: Current status (50 chars max)

## Implementation Steps

### 1. Create/Update Profile

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `use pubky_app_specs::{PubkyAppUser, PubkyAppUserLink, Validatable};

async fn create_profile(
    session: &PubkySession,
    name: String,
    bio: Option<String>,
    image: Option<String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let user = PubkyAppUser::new(
        name,
        bio,
        image,
        Some(vec![
            PubkyAppUserLink::new(
                "GitHub".to_string(),
                "https://github.com/username".to_string()
            )
        ]),
        Some("Building on Pubky".to_string())
    );

    // Validate
    user.validate(None)?;

    // Save to storage
    let path = PubkyAppUser::create_path();
    let json = serde_json::to_string(&user)?;
    session.storage().put(&path, json.as_bytes()).await?;

    Ok(())
}`
    : `import { PubkySpecsBuilder } from 'pubky-app-specs';

async function createProfile(session, userId, profileData) {
  const specsBuilder = new PubkySpecsBuilder(userId);
  
  const { user, meta } = specsBuilder.createUser(
    profileData.name,
    profileData.bio || null,
    profileData.image || null,
    profileData.links || [],
    profileData.status || null
  );

  // Validate (automatic in createUser)
  // Save to storage
  await session.storage().put(meta.url, user.toJson());

  return { user, meta };
}`
}
\`\`\`

### 2. Fetch User Profile

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `// Fetch via Nexus API (includes counts, tags, etc.)
async fn fetch_user_profile(user_id: &str, viewer_id: Option<&str>) -> Result<UserView, reqwest::Error> {
    let mut url = format!("https://nexus.example.com/v0/user/{}", user_id);
    if let Some(viewer) = viewer_id {
        url.push_str(&format!("?viewer_id={}", viewer));
    }
    
    reqwest::get(&url).await?.json().await
}

// Or fetch directly from homeserver
async fn fetch_profile_raw(pubky: &Pubky, user_id: &str) -> Result<PubkyAppUser, Box<dyn std::error::Error>> {
    let public_storage = pubky.public_storage();
    let uri = format!("pubky://{}/pub/pubky.app/profile.json", user_id);
    let response = public_storage.get(&uri).await?;
    let json = response.text().await?;
    let user: PubkyAppUser = serde_json::from_str(&json)?;
    Ok(user)
}`
    : `// Fetch via Nexus API (includes counts, tags, relationship)
async function fetchUserProfile(userId, viewerId = null) {
  const params = new URLSearchParams();
  if (viewerId) params.append('viewer_id', viewerId);
  
  const url = \`https://nexus.example.com/v0/user/\${userId}?\${params}\`;
  const response = await fetch(url);
  return await response.json(); // Returns UserView with full social data
}

// Or fetch directly from homeserver
async function fetchProfileRaw(pubky, userId) {
  const publicStorage = pubky.publicStorage();
  const uri = \`pubky://\${userId}/pub/pubky.app/profile.json\`;
  const response = await publicStorage.get(uri);
  return JSON.parse(await response.text());
}`
}
\`\`\`

### 3. Build Profile UI

${
  language === 'typescript'
    ? `\`\`\`tsx
import React, { useState, useEffect } from 'react';

export function UserProfile({ userId, viewerId, canEdit }) {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchUserProfile(userId, viewerId).then(setProfile);
  }, [userId, viewerId]);

  if (!profile) return <div>Loading...</div>;

  const { details, counts, relationship, tags } = profile;

  return (
    <div className="user-profile">
      {details.image && <img src={details.image} alt={details.name} />}
      
      <h1>{details.name}</h1>
      {details.status && <p className="status">{details.status}</p>}
      {details.bio && <p className="bio">{details.bio}</p>}

      <div className="stats">
        <span>{counts.posts} posts</span>
        <span>{counts.followers} followers</span>
        <span>{counts.following} following</span>
      </div>

      {details.links && (
        <div className="links">
          {details.links.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener">
              {link.title}
            </a>
          ))}
        </div>
      )}

      {relationship && (
        <div className="relationship">
          {relationship.following && <span>✓ Following</span>}
          {relationship.followed_by && <span>Follows you</span>}
        </div>
      )}

      {tags.length > 0 && (
        <div className="tags">
          {tags.map(tag => (
            <span key={tag.label} className="tag">
              {tag.label} ({tag.taggers_count})
            </span>
          ))}
        </div>
      )}

      {canEdit && (
        <button onClick={() => setIsEditing(true)}>Edit Profile</button>
      )}
    </div>
  );
}
\`\`\`
`
    : `\`\`\`javascript
async function renderProfile(userId, containerId) {
  const profile = await fetchUserProfile(userId);
  const { details, counts, tags } = profile;

  const html = \`
    <div class="user-profile">
      \${details.image ? \`<img src="\${details.image}" alt="\${details.name}">\` : ''}
      <h1>\${details.name}</h1>
      \${details.status ? \`<p class="status">\${details.status}</p>\` : ''}
      \${details.bio ? \`<p class="bio">\${details.bio}</p>\` : ''}
      
      <div class="stats">
        <span>\${counts.posts} posts</span>
        <span>\${counts.followers} followers</span>
        <span>\${counts.following} following</span>
      </div>

      \${details.links ? \`
        <div class="links">
          \${details.links.map(link => \`
            <a href="\${link.url}" target="_blank">\${link.title}</a>
          \`).join('')}
        </div>
      \` : ''}

      \${tags.length > 0 ? \`
        <div class="tags">
          \${tags.map(tag => \`
            <span class="tag">\${tag.label} (\${tag.taggers_count})</span>
          \`).join('')}
        </div>
      \` : ''}
    </div>
  \`;

  document.getElementById(containerId).innerHTML = html;
}
\`\`\`
`
}

### 4. Profile Edit Form

Follow the same pattern as the post creation form:
- Use \`PubkySpecsBuilder.createUser()\` for validation
- Show character counts for bio/status
- Validate URLs for links
- Handle image uploads

## Validation Rules

Automatic validation includes:
- ✅ Name: 3-50 characters, not "[DELETED]"
- ✅ Bio: Max 160 characters
- ✅ Image: Valid URL, max 300 characters
- ✅ Links: Max 5, each with valid URL
- ✅ Status: Max 50 characters

## Advanced Features

### Follow/Unfollow

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `async fn follow_user(session: &PubkySession, user_id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let follow = PubkyAppFollow::new();
    let path = PubkyAppFollow::create_path(user_id);
    let json = serde_json::to_string(&follow)?;
    session.storage().put(&path, json.as_bytes()).await?;
    Ok(())
}`
    : `async function followUser(session, userId, targetUserId) {
  const specsBuilder = new PubkySpecsBuilder(userId);
  const { follow, meta } = specsBuilder.createFollow(targetUserId);
  await session.storage().put(meta.url, follow.toJson());
}`
}
\`\`\`

### Tag Users

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `async fn tag_user(session: &PubkySession, target_uri: &str, label: &str) -> Result<(), Box<dyn std::error::Error>> {
    let tag = PubkyAppTag::new(target_uri.to_string(), label.to_string());
    let tag_id = tag.create_id();
    let path = PubkyAppTag::create_path(&tag_id);
    let json = serde_json::to_string(&tag)?;
    session.storage().put(&path, json.as_bytes()).await?;
    Ok(())
}`
    : `async function tagUser(session, userId, targetUri, label) {
  const specsBuilder = new PubkySpecsBuilder(userId);
  const { tag, meta } = specsBuilder.createTag(targetUri, label);
  await session.storage().put(meta.url, tag.toJson());
}`
}
\`\`\`

## Next Steps

- Use \`query_nexus_api\` for user search endpoints
- Use \`explain_model\` to understand UserView schema
- Build a user directory with \`/v0/stream/users\`

Need help with specific features? Just ask!`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `How do I implement user profile management in ${language}?`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  private async querySocialDataPrompt(
    args: Record<string, string>
  ): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    const dataType = args.data_type || 'posts';
    const language = args.language || 'javascript';

    const endpointMap: Record<string, { endpoint: string; description: string }> = {
      posts: {
        endpoint: '/v0/stream/posts',
        description: 'Stream posts with filtering and pagination',
      },
      users: {
        endpoint: '/v0/stream/users',
        description: 'Stream users with various sources',
      },
      tags: {
        endpoint: '/v0/tags/hot',
        description: 'Get trending tags',
      },
      streams: {
        endpoint: '/v0/stream/posts',
        description: 'Various post streams',
      },
    };

    const info = endpointMap[dataType.toLowerCase()] || endpointMap.posts;

    const prompt = `I'll show you how to query ${dataType} from the Nexus API in ${language}.

## Endpoint: ${info.endpoint}

${info.description}

## Basic Query

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `use reqwest;

async fn query_${dataType}() -> Result<Vec<serde_json::Value>, reqwest::Error> {
    let url = "https://nexus.example.com${info.endpoint}";
    let response = reqwest::get(url).await?;
    response.json().await
}`
    : `async function query${dataType.charAt(0).toUpperCase() + dataType.slice(1)}() {
  const response = await fetch('https://nexus.example.com${info.endpoint}');
  return await response.json();
}`
}
\`\`\`

## Advanced Queries

### With Pagination

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `async fn query_with_pagination(skip: u32, limit: u32) -> Result<Vec<serde_json::Value>, reqwest::Error> {
    let url = format!("https://nexus.example.com${info.endpoint}?skip={}&limit={}", skip, limit);
    reqwest::get(&url).await?.json().await
}`
    : `async function queryWithPagination(skip = 0, limit = 20) {
  const params = new URLSearchParams({ skip, limit });
  const response = await fetch(\`https://nexus.example.com${info.endpoint}?\${params}\`);
  return await response.json();
}`
}
\`\`\`

### With Filtering

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `async fn query_with_filters(
    source: &str,
    observer_id: &str,
    tags: Vec<String>,
) -> Result<Vec<serde_json::Value>, reqwest::Error> {
    let tags_str = tags.join(",");
    let url = format!(
        "https://nexus.example.com${info.endpoint}?source={}&observer_id={}&tags={}",
        source, observer_id, tags_str
    );
    reqwest::get(&url).await?.json().await
}`
    : `async function queryWithFilters(source, observerId, tags = []) {
  const params = new URLSearchParams({
    source,
    observer_id: observerId,
    tags: tags.join(',')
  });
  const response = await fetch(\`https://nexus.example.com${info.endpoint}?\${params}\`);
  return await response.json();
}`
}
\`\`\`

## Complete Example

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `use reqwest;
use serde::Deserialize;

#[derive(Deserialize)]
struct QueryResult {
    // Define based on endpoint response
}

async fn advanced_query() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    
    let response = client
        .get("https://nexus.example.com${info.endpoint}")
        .query(&[
            ("skip", "0"),
            ("limit", "20"),
            ("sorting", "timeline"),
        ])
        .send()
        .await?;

    let data: Vec<QueryResult> = response.json().await?;
    
    for item in data {
        // Process each item
    }

    Ok(())
}`
    : `class NexusClient {
  constructor(baseUrl = 'https://nexus.example.com') {
    this.baseUrl = baseUrl;
  }

  async query${dataType.charAt(0).toUpperCase() + dataType.slice(1)}(options = {}) {
    const params = new URLSearchParams({
      skip: options.skip || 0,
      limit: options.limit || 20,
      ...options.filters
    });

    const response = await fetch(\`\${this.baseUrl}${info.endpoint}?\${params}\`);
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }

    return await response.json();
  }
}

// Usage
const client = new NexusClient();
const results = await client.query${dataType.charAt(0).toUpperCase() + dataType.slice(1)}({
  skip: 0,
  limit: 20,
  filters: {
    sorting: 'timeline',
    source: 'all'
  }
});

console.log(\`Found \${results.length} results\`);
results.forEach(item => console.log(item));`
}
\`\`\`

## Available Query Parameters

Use \`explain_nexus_endpoint\` tool to see all available parameters for specific endpoints.

Common parameters:
- **skip**: Number of items to skip (pagination)
- **limit**: Maximum number of items to return
- **sorting**: Sort method (timeline, total_engagement)
- **source**: Data source (all, following, friends, etc.)
- **viewer_id**: Personalize results for a specific user
- **tags**: Filter by comma-separated tags

## Error Handling

\`\`\`${language === 'rust' ? 'rust' : 'javascript'}
${
  language === 'rust'
    ? `match query_${dataType}().await {
    Ok(results) => println!("Got {} results", results.len()),
    Err(e) => eprintln!("Query failed: {}", e),
}`
    : `try {
  const results = await query${dataType.charAt(0).toUpperCase() + dataType.slice(1)}();
  console.log(\`Got \${results.length} results\`);
} catch (error) {
  if (error.response?.status === 404) {
    console.log('No results found');
  } else if (error.response?.status === 500) {
    console.error('Server error');
  } else {
    console.error('Query failed:', error);
  }
}`
}
\`\`\`

## Next Steps

- Use \`query_nexus_api\` to explore more endpoints
- Use \`generate_nexus_client\` to create a full client
- Check \`pubky://api/nexus/schemas\` for response structures

Need help with a specific query? Just ask!`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `How do I query ${dataType} from Nexus API?`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }

  private async validateAppDataPrompt(
    args: Record<string, string>
  ): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
    const model = args.model || 'user';

    const prompt = `I'll show you how to validate ${model} data using Pubky app specs.

## Understanding Validation

Pubky app specs provide automatic validation for all data models:
- **Type checking**: Ensures correct data types
- **Length limits**: Enforces character/size limits
- **Format validation**: URLs, URIs, enums
- **Sanitization**: Automatic trimming and normalization

## Using the Validation System

### JavaScript/TypeScript

\`\`\`javascript
import { PubkySpecsBuilder } from 'pubky-app-specs';

const userId = 'your-pubky-id';
const specsBuilder = new PubkySpecsBuilder(userId);

// Method 1: Use builder (automatic validation)
try {
  const { ${model}, meta } = specsBuilder.create${model.charAt(0).toUpperCase() + model.slice(1)}(
    /* your data */
  );
  console.log('✓ Data is valid!');
} catch (error) {
  console.error('Validation failed:', error.message);
}

// Method 2: Manual validation (advanced)
import { PubkyApp${model.charAt(0).toUpperCase() + model.slice(1)} } from 'pubky-app-specs';

const data = PubkyApp${model.charAt(0).toUpperCase() + model.slice(1)}.fromJson({
  /* your JSON data */
});

// Data is automatically sanitized and validated
\`\`\`

### Rust

\`\`\`rust
use pubky_app_specs::{PubkyApp${model.charAt(0).toUpperCase() + model.slice(1)}, Validatable};

// Create with automatic sanitization
let ${model} = PubkyApp${model.charAt(0).toUpperCase() + model.slice(1)}::new(/* parameters */);

// Validate
match ${model}.validate(None) {
    Ok(_) => println!("✓ Data is valid!"),
    Err(e) => eprintln!("Validation failed: {}", e),
}

// Or use try_from for JSON validation
let json = r#"{ /* your JSON */ }"#;
match PubkyApp${model.charAt(0).toUpperCase() + model.slice(1)}::try_from(json.as_bytes(), "") {
    Ok(${model}) => println!("✓ Valid and deserialized!"),
    Err(e) => eprintln!("Invalid: {}", e),
}
\`\`\`

## Validation Rules for ${model}

Use the \`explain_model\` tool to see complete validation rules:

\`\`\`javascript
// Check validation rules
const rules = await explainModel('${model}');
console.log(rules);
\`\`\`

## Common Validation Errors

### 1. Length Violations

\`\`\`javascript
// ❌ Too short/long
const { user } = specsBuilder.createUser(
  'AB',  // Too short (min 3 chars)
  null, null, null, null
);
// Error: "Validation Error: Invalid name length"
\`\`\`

### 2. Invalid URLs

\`\`\`javascript
// ❌ Malformed URL
const { user } = specsBuilder.createUser(
  'Alice',
  null,
  'not-a-url',  // Invalid
  null, null
);
// Error: Invalid URL or automatically sanitized to null
\`\`\`

### 3. Reserved Keywords

\`\`\`javascript
// ❌ Reserved keyword
const { post } = specsBuilder.createPost(
  '[DELETED]',  // Reserved
  PubkyAppPostKind.Short,
  null, null, null
);
// Automatically sanitized to "empty"
\`\`\`

## Pre-flight Validation

Validate before submission:

\`\`\`javascript
function validateBeforeSubmit(formData) {
  const errors = {};

  // Check name length
  if (formData.name.length < 3 || formData.name.length > 50) {
    errors.name = 'Name must be 3-50 characters';
  }

  // Check bio length
  if (formData.bio && formData.bio.length > 160) {
    errors.bio = 'Bio must be 160 characters or less';
  }

  // Check URL format
  if (formData.image) {
    try {
      new URL(formData.image);
    } catch {
      errors.image = 'Invalid URL format';
    }
  }

  // Check links
  if (formData.links && formData.links.length > 5) {
    errors.links = 'Maximum 5 links allowed';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Use in form
const validation = validateBeforeSubmit(formData);
if (!validation.isValid) {
  displayErrors(validation.errors);
  return;
}

// Proceed with creation
const { ${model} } = specsBuilder.create${model.charAt(0).toUpperCase() + model.slice(1)}(/* ... */);
\`\`\`

## Sanitization Features

The specs automatically sanitize data:

1. **Trimming**: Whitespace removed
2. **Length enforcement**: Truncates to max length
3. **URL normalization**: Converts to valid URLs
4. **Lowercasing**: For tags and labels
5. **Reserved word filtering**: Replaces forbidden keywords

\`\`\`javascript
// Input
const { user } = specsBuilder.createUser(
  '  Alice  ',  // Extra whitespace
  '  Developer and designer  ',  // Whitespace in bio
  null, null, null
);

// Output (automatically sanitized)
console.log(user.name);  // 'Alice' (trimmed)
console.log(user.bio);   // 'Developer and designer' (trimmed)
\`\`\`

## Testing Validation

\`\`\`javascript
// Unit test example
describe('${model} validation', () => {
  it('should accept valid data', () => {
    const { ${model} } = specsBuilder.create${model.charAt(0).toUpperCase() + model.slice(1)}(/* valid data */);
    expect(${model}).toBeDefined();
  });

  it('should reject invalid data', () => {
    expect(() => {
      specsBuilder.create${model.charAt(0).toUpperCase() + model.slice(1)}(/* invalid data */);
    }).toThrow();
  });
});
\`\`\`

## Best Practices

1. ✅ Validate early - check data before API calls
2. ✅ Display validation errors clearly to users
3. ✅ Use real-time validation in forms
4. ✅ Trust the automatic sanitization
5. ✅ Test edge cases (max length, special chars, etc.)

## Next Steps

- Use \`explain_model\` for complete ${model} validation rules
- Use \`create_model_example\` for working examples
- Use \`validate_model_data\` tool to test JSON data

Need help with specific validation? Just ask!`;

    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `How do I validate ${model} data?`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
    };
  }
}
