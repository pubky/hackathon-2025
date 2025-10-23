/**
 * Code generation templates for Pubky applications
 */

import type { CodeTemplate } from '../types.js';

export const templates: Record<string, CodeTemplate> = {
  // JavaScript/TypeScript templates
  'js-basic-app': {
    name: 'Basic JavaScript Pubky App',
    description: 'A minimal Pubky application setup',
    language: 'javascript',
    dependencies: ['@synonymdev/pubky'],
    code: `import { Pubky, Keypair } from '@synonymdev/pubky';

// Initialize Pubky client
const pubky = new Pubky(); // or Pubky.testnet() for local development

// Create a new user with a random keypair
const keypair = Keypair.random();
const signer = pubky.signer(keypair);

// Sign up on a homeserver
const homeserverPubkey = 'YOUR_HOMESERVER_PUBLIC_KEY';
const session = await signer.signup(homeserverPubkey, null);

// Write data to storage
await session.storage().put('/pub/my-app/data.json', JSON.stringify({ hello: 'world' }));

// Read data back
const data = await session.storage().get('/pub/my-app/data.json');
console.log('Stored data:', await data.text());
`,
  },

  'js-auth-flow': {
    name: 'JavaScript Auth Flow',
    description: 'Implement Pubky QR authentication for keyless apps',
    language: 'javascript',
    dependencies: ['@synonymdev/pubky'],
    code: `import { Pubky, Capabilities } from '@synonymdev/pubky';

const pubky = new Pubky();

// Define required capabilities
const caps = Capabilities.builder()
  .readWrite('/pub/my-app/')
  .finish();

// Start auth flow
const flow = pubky.startAuthFlow(caps);

// Display QR code to user
console.log('Scan this QR code with your Pubky authenticator:');
console.log(flow.authorizationUrl());

// Wait for user approval
const session = await flow.awaitApproval();

console.log('Authentication successful!');
console.log('User public key:', session.publicKey());

// Now you can use the session
await session.storage().put('/pub/my-app/profile.json', JSON.stringify({
  name: 'User',
  createdAt: new Date().toISOString()
}));
`,
  },

  'js-public-read': {
    name: 'JavaScript Public Storage Read',
    description: 'Read public data from any Pubky user',
    language: 'javascript',
    dependencies: ['@synonymdev/pubky'],
    code: `import { Pubky } from '@synonymdev/pubky';

const pubky = new Pubky();
const publicStorage = pubky.publicStorage();

// Read a specific file
const userPubkey = 'USER_PUBLIC_KEY';
const file = await publicStorage.get(\`pubky\${userPubkey}/pub/my-app/profile.json\`);
const profile = JSON.parse(await file.text());
console.log('User profile:', profile);

// List files in a directory
const entries = await publicStorage
  .list(\`pubky\${userPubkey}/pub/my-app/\`)
  .limit(10)
  .send();

for (const entry of entries) {
  console.log('Found:', entry.path);
}
`,
  },

  'ts-express-app': {
    name: 'TypeScript Express App with Pubky',
    description: 'Full Express.js backend with Pubky integration',
    language: 'typescript',
    dependencies: ['@synonymdev/pubky', 'express'],
    code: `import express from 'express';
import { Pubky, Capabilities, PubkySession } from '@synonymdev/pubky';

const app = express();
app.use(express.json());

const pubky = new Pubky();

// Store active sessions
const sessions = new Map<string, PubkySession>();

// Auth endpoint
app.post('/auth/start', async (req, res) => {
  const caps = Capabilities.builder()
    .readWrite('/pub/my-app/')
    .finish();
  
  const flow = pubky.startAuthFlow(caps);
  
  res.json({
    authUrl: flow.authorizationUrl(),
    sessionId: flow.clientSecret() // Use as temp session ID
  });
  
  // Await approval in background
  flow.awaitApproval().then(session => {
    sessions.set(flow.clientSecret(), session);
  });
});

// Check auth status
app.get('/auth/status/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (session) {
    res.json({ 
      authenticated: true,
      publicKey: session.publicKey()
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Protected endpoint
app.post('/api/data', async (req, res) => {
  const sessionId = req.headers['x-session-id'] as string;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Write to user's storage
  await session.storage().put(
    '/pub/my-app/data.json',
    JSON.stringify(req.body)
  );
  
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
`,
  },

  // Rust templates
  'rust-basic-app': {
    name: 'Basic Rust Pubky App',
    description: 'A minimal Rust Pubky application',
    language: 'rust',
    dependencies: ['pubky = "0.4"', 'tokio = { version = "1", features = ["full"] }'],
    code: `use pubky::prelude::*;

#[tokio::main]
async fn main() -> pubky::Result<()> {
    // Initialize Pubky client
    let pubky = Pubky::new()?; // or Pubky::testnet() for local development
    
    // Create a new user with a random keypair
    let keypair = Keypair::random();
    let signer = pubky.signer(keypair);
    
    // Sign up on a homeserver
    let homeserver = PublicKey::try_from("YOUR_HOMESERVER_PUBLIC_KEY")?;
    let session = signer.signup(&homeserver, None).await?;
    
    // Write data to storage
    session.storage()
        .put("/pub/my-app/hello.txt", "Hello, Pubky!")
        .await?;
    
    // Read data back
    let response = session.storage()
        .get("/pub/my-app/hello.txt")
        .await?;
    let text = response.text().await?;
    
    println!("Stored data: {}", text);
    
    Ok(())
}
`,
  },

  'rust-auth-flow': {
    name: 'Rust Auth Flow',
    description: 'Implement Pubky authentication flow in Rust',
    language: 'rust',
    dependencies: ['pubky = "0.4"', 'tokio = { version = "1", features = ["full"] }'],
    code: `use pubky::prelude::*;

#[tokio::main]
async fn main() -> pubky::Result<()> {
    let pubky = Pubky::new()?;
    
    // Define required capabilities
    let caps = Capabilities::builder()
        .read_write("/pub/my-app/")
        .finish();
    
    // Start auth flow
    let flow = pubky.start_auth_flow(&caps)?;
    
    // Display authorization URL (could be shown as QR code)
    println!("Scan this URL with your Pubky authenticator:");
    println!("{}", flow.authorization_url());
    
    // Wait for user approval
    println!("Waiting for approval...");
    let session = flow.await_approval().await?;
    
    println!("Authentication successful!");
    println!("User public key: {}", session.info().public_key());
    
    // Now you can use the session
    session.storage()
        .put("/pub/my-app/profile.json", r#"{"name": "User"}"#)
        .await?;
    
    Ok(())
}
`,
  },

  'rust-public-read': {
    name: 'Rust Public Storage Read',
    description: 'Read public data from any Pubky user in Rust',
    language: 'rust',
    dependencies: ['pubky = "0.4"', 'tokio = { version = "1", features = ["full"] }'],
    code: `use pubky::prelude::*;

#[tokio::main]
async fn main() -> pubky::Result<()> {
    let pubky = Pubky::new()?;
    let public_storage = pubky.public_storage();
    
    // The user's public key you want to read from
    let user_pubkey = PublicKey::try_from("USER_PUBLIC_KEY")?;
    
    // Read a specific file
    let file = public_storage
        .get(format!("pubky{}/pub/my-app/profile.json", user_pubkey))
        .await?;
    let profile = file.text().await?;
    println!("User profile: {}", profile);
    
    // List files in a directory
    let entries = public_storage
        .list(format!("pubky{}/pub/my-app/", user_pubkey))?
        .limit(10)
        .send()
        .await?;
    
    for entry in entries {
        println!("Found: {}", entry.to_pubky_url());
    }
    
    Ok(())
}
`,
  },

  // Pkarr templates
  'pkarr-client-js': {
    name: 'Pkarr Client (JavaScript)',
    description: 'Basic Pkarr client for publishing and resolving DNS records',
    language: 'javascript',
    dependencies: ['pkarr'],
    code: `const { Client, Keypair, SignedPacket } = require('pkarr');

// Initialize client with default relays
const client = new Client();

// Generate or load keypair
const keypair = new Keypair();
const publicKey = keypair.public_key_string();
console.log('Public Key:', publicKey);

// Build DNS records
const builder = SignedPacket.builder();
builder.addTxtRecord('_service', 'myapp=v1.0', 3600);
builder.addARecord('www', '192.168.1.1', 3600);

// Sign and publish
const packet = builder.buildAndSign(keypair);
await client.publish(packet);

console.log('Published! Your domain is:', \`https://\${publicKey}\`);

// Resolve records later
const resolved = await client.resolve(publicKey);
console.log('DNS Records:', resolved.records);
`,
  },

  'pkarr-client-rust': {
    name: 'Pkarr Client (Rust)',
    description: 'Basic Pkarr client for publishing and resolving DNS records',
    language: 'rust',
    dependencies: ['pkarr = "5.0"'],
    code: `use pkarr::{Client, Keypair, SignedPacket};
use simple_dns::{Name, CLASS, ResourceRecord, rdata::TXT};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize client
    let client = Client::default();
    
    // Generate or load keypair
    let keypair = Keypair::random();
    let public_key = keypair.public_key();
    println!("Public Key: {}", public_key);
    
    // Create signed packet
    let mut packet = SignedPacket::new(&keypair)?;
    
    // Add DNS records
    packet.add_answer(ResourceRecord::new(
        Name::new_unchecked("_service"),
        CLASS::IN,
        3600,
        TXT::new().with_string("myapp=v1.0")
    ));
    
    // Publish to DHT
    client.publish(&packet).await?;
    
    println!("Published! Your domain is: https://{}", public_key);
    
    // Resolve records later
    if let Some(resolved) = client.resolve(&public_key.to_string()).await? {
        println!("DNS Records: {:?}", resolved);
    }
    
    Ok(())
}
`,
  },

  'pkarr-publish-records': {
    name: 'Publish DNS Records',
    description: 'Publish various DNS record types using Pkarr',
    language: 'javascript',
    dependencies: ['pkarr'],
    code: `const { Client, Keypair, SignedPacket } = require('pkarr');

const client = new Client();
const keypair = new Keypair();

// Build comprehensive DNS records
const builder = SignedPacket.builder();

// TXT record for service metadata
builder.addTxtRecord('_service', 'app=myapp version=1.0', 3600);

// A record for IPv4
builder.addARecord('www', '192.168.1.1', 3600);

// AAAA record for IPv6
builder.addAAAARecord('www', '2001:db8::1', 3600);

// CNAME record for alias
builder.addCnameRecord('api', 'www', 3600);

// HTTPS record with service parameters
builder.addHttpsRecord('@', 1, '.', 3600, {
  port: 443,
  ipv4hint: '192.168.1.1',
  alpn: ['h2', 'http/1.1']
});

// Sign and publish
const packet = builder.buildAndSign(keypair);
await client.publish(packet);

console.log('All records published for key:', keypair.public_key_string());
`,
  },

  'pkarr-resolve-key': {
    name: 'Resolve Pkarr Key',
    description: 'Resolve a public key to get DNS records',
    language: 'javascript',
    dependencies: ['pkarr'],
    code: `const { Client } = require('pkarr');

async function resolveKey(publicKey) {
  const client = new Client();
  
  try {
    const packet = await client.resolve(publicKey);
    
    if (!packet) {
      console.log('No records found for key:', publicKey);
      return null;
    }
    
    console.log('Resolved records for key:', publicKey);
    console.log('Timestamp:', new Date(packet.timestampMs));
    console.log('Records:');
    
    for (const record of packet.records) {
      console.log(\`  - \${record.name}: \${record.type} = \${record.data}\`);
    }
    
    return packet;
  } catch (error) {
    console.error('Resolution failed:', error.message);
    return null;
  }
}

// Example usage
const publicKey = 'YOUR_PUBLIC_KEY_HERE';
await resolveKey(publicKey);
`,
  },

  'pkarr-keypair-management': {
    name: 'Keypair Management',
    description: 'Generate, save, and load Pkarr keypairs securely',
    language: 'javascript',
    dependencies: ['pkarr'],
    code: `const { Keypair } = require('pkarr');
const fs = require('fs').promises;

// Generate new keypair
function generateKeypair() {
  const keypair = new Keypair();
  const publicKey = keypair.public_key_string();
  const secretKey = keypair.secret_key_bytes();
  
  return {
    publicKey,
    secretKey: Buffer.from(secretKey).toString('hex')
  };
}

// Save keypair securely (use proper encryption in production!)
async function saveKeypair(keys, filepath) {
  await fs.writeFile(
    filepath,
    JSON.stringify(keys, null, 2),
    { mode: 0o600 } // Owner read/write only
  );
  console.log('Keypair saved to:', filepath);
  console.log('Public Key:', keys.publicKey);
  console.log('⚠️  Keep the secret key secure!');
}

// Load keypair from file
async function loadKeypair(filepath) {
  const data = await fs.readFile(filepath, 'utf-8');
  const keys = JSON.parse(data);
  
  // Recreate keypair from secret key
  const secretBytes = Buffer.from(keys.secretKey, 'hex');
  const keypair = Keypair.from_secret_key(secretBytes);
  
  return keypair;
}

// Example usage
const keys = generateKeypair();
await saveKeypair(keys, './pkarr-keys.json');

// Later, load the keypair
const loadedKeypair = await loadKeypair('./pkarr-keys.json');
console.log('Loaded keypair for:', loadedKeypair.public_key_string());
`,
  },
};

export function getTemplate(name: string): CodeTemplate | undefined {
  return templates[name];
}

export function listTemplates(): Array<{ name: string; description: string; language: string }> {
  return Object.entries(templates).map(([key, template]) => ({
    name: key,
    description: template.description,
    language: template.language,
  }));
}

export function generateScaffold(
  projectName: string,
  language: 'rust' | 'javascript' | 'typescript',
  features: string[]
): { files: Map<string, string>; instructions: string } {
  const files = new Map<string, string>();

  if (language === 'rust') {
    // Cargo.toml
    files.set(
      'Cargo.toml',
      `[package]
name = "${projectName}"
version = "0.1.0"
edition = "2021"

[dependencies]
pubky = "0.4"
tokio = { version = "1", features = ["full"] }
anyhow = "1.0"
${features.includes('json') ? 'serde = { version = "1.0", features = ["derive"] }\nserde_json = "1.0"' : ''}
`
    );

    // src/main.rs
    const mainCode = features.includes('auth')
      ? templates['rust-auth-flow'].code
      : templates['rust-basic-app'].code;
    files.set('src/main.rs', mainCode);

    // README.md
    files.set(
      'README.md',
      `# ${projectName}

A Pubky application built with Rust.

## Getting Started

1. Install Rust: https://rustup.rs/
2. Run the application:
   \`\`\`bash
   cargo run
   \`\`\`

## Development with Testnet

Start a local testnet:
\`\`\`bash
cargo install pubky-testnet
pubky-testnet
\`\`\`

Then update your code to use \`Pubky::testnet()\` instead of \`Pubky::new()\`.
`
    );

    return {
      files,
      instructions: `Rust project scaffold created! 

Next steps:
1. cd ${projectName}
2. cargo build
3. Update YOUR_HOMESERVER_PUBLIC_KEY in src/main.rs
4. cargo run

For local development, start testnet with: pubky-testnet
`,
    };
  } else {
    // package.json
    const packageJson = {
      name: projectName,
      version: '1.0.0',
      type: 'module',
      scripts: {
        start: language === 'typescript' ? 'tsx src/index.ts' : 'node src/index.js',
        dev: language === 'typescript' ? 'tsx watch src/index.ts' : 'node --watch src/index.js',
      },
      dependencies: {
        '@synonymdev/pubky': '^0.4.0',
      },
      devDependencies:
        language === 'typescript'
          ? {
              typescript: '^5.0.0',
              tsx: '^4.0.0',
              '@types/node': '^20.0.0',
            }
          : {},
    };

    files.set('package.json', JSON.stringify(packageJson, null, 2));

    if (language === 'typescript') {
      files.set(
        'tsconfig.json',
        `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
`
      );
    }

    // Main file
    const mainCode = features.includes('auth')
      ? templates['js-auth-flow'].code
      : templates['js-basic-app'].code;
    const mainFile = language === 'typescript' ? 'src/index.ts' : 'src/index.js';
    files.set(mainFile, mainCode);

    // README.md
    files.set(
      'README.md',
      `# ${projectName}

A Pubky application built with ${language === 'typescript' ? 'TypeScript' : 'JavaScript'}.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run the application:
   \`\`\`bash
   npm start
   \`\`\`

## Development with Testnet

Start a local testnet:
\`\`\`bash
npx pubky-testnet
\`\`\`

Then update your code to use \`Pubky.testnet()\` instead of \`new Pubky()\`.
`
    );

    return {
      files,
      instructions: `${language === 'typescript' ? 'TypeScript' : 'JavaScript'} project scaffold created!

Next steps:
1. cd ${projectName}
2. npm install
3. Update YOUR_HOMESERVER_PUBLIC_KEY in ${mainFile}
4. npm start

For local development, start testnet with: npx pubky-testnet
`,
    };
  }
}
