/**
 * App Specs Parser - Utilities for parsing and exposing pubky-app-specs model information
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface ModelInfo {
  name: string;
  description: string;
  uri: string;
  fields: ModelField[];
  validation: ValidationRule[];
}

export interface ModelField {
  name: string;
  type: string;
  description: string;
  required: boolean;
  validation?: string;
}

export interface ValidationRule {
  field: string;
  rule: string;
  description: string;
}

export class AppSpecsParser {
  private workspaceRoot: string;
  private specsRoot: string;
  private readmeContent: string | null = null;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.specsRoot = path.join(workspaceRoot, 'pubky-app-specs');
  }

  async loadReadme(): Promise<void> {
    if (this.readmeContent) return;

    const readmePath = path.join(this.specsRoot, 'README.md');
    this.readmeContent = await fs.readFile(readmePath, 'utf-8');
  }

  async getOverview(): Promise<string> {
    await this.loadReadme();
    return this.readmeContent || 'README not found';
  }

  async getModelInfo(modelName: string): Promise<string> {
    await this.loadReadme();

    const modelMap: Record<string, string> = {
      user: 'PubkyAppUser',
      post: 'PubkyAppPost',
      tag: 'PubkyAppTag',
      bookmark: 'PubkyAppBookmark',
      follow: 'PubkyAppFollow',
      file: 'PubkyAppFile',
      feed: 'PubkyAppFeed',
      mute: 'PubkyAppMute',
      'last_read': 'PubkyAppLastRead',
      blob: 'PubkyAppBlob',
    };

    const fullModelName = modelMap[modelName.toLowerCase()] || modelName;

    // Extract model section from README
    const regex = new RegExp(
      `### ${fullModelName}[\\s\\S]*?(?=###|## |$)`,
      'i'
    );
    const match = this.readmeContent?.match(regex);

    if (!match) {
      return `Model ${fullModelName} not found in documentation`;
    }

    let output = `# ${fullModelName} Model\n\n`;
    output += match[0];

    // Add code example from model file
    try {
      const modelFileName = modelName.toLowerCase() + '.rs';
      const modelPath = path.join(this.specsRoot, 'src', 'models', modelFileName);
      const modelCode = await fs.readFile(modelPath, 'utf-8');

      // Extract struct definition
      const structMatch = modelCode.match(/pub struct \w+[^}]+}/s);
      if (structMatch) {
        output += `\n\n## Rust Definition\n\n\`\`\`rust\n${structMatch[0]}\n\`\`\`\n`;
      }
    } catch {
      // Model file not found, skip code
    }

    return output;
  }

  async generateModelExample(modelName: string, language: 'javascript' | 'typescript' | 'rust'): Promise<string> {
    const examples: Record<string, any> = {
      user: {
        javascript: `import { PubkyAppUser, PubkySpecsBuilder } from 'pubky-app-specs';

// Create a user profile
const userId = '8kkppkmiubfq4pxn6f73nqrhhhgkb5xyfprntc9si3np9ydbotto';
const specsBuilder = new PubkySpecsBuilder(userId);

const { user, meta } = specsBuilder.createUser(
  'Alice Smith',           // name
  'Software Developer',    // bio
  'https://example.com/avatar.png',  // image
  [
    { title: 'GitHub', url: 'https://github.com/alice' },
    { title: 'Website', url: 'https://alice.dev' }
  ],                       // links
  'Building on Pubky'      // status
);

console.log('User Profile URL:', meta.url);
console.log('User Data:', user.toJson());`,
        rust: `use pubky_app_specs::{PubkyAppUser, PubkyAppUserLink, Validatable};

// Create a user profile
let user = PubkyAppUser::new(
    "Alice Smith".to_string(),
    Some("Software Developer".to_string()),
    Some("https://example.com/avatar.png".to_string()),
    Some(vec![
        PubkyAppUserLink::new(
            "GitHub".to_string(),
            "https://github.com/alice".to_string()
        ),
        PubkyAppUserLink::new(
            "Website".to_string(),
            "https://alice.dev".to_string()
        )
    ]),
    Some("Building on Pubky".to_string())
);

// Validate
user.validate(None)?;

// Serialize to JSON
let json = serde_json::to_string(&user)?;
println!("User: {}", json);`,
      },
      post: {
        javascript: `import { PubkyAppPost, PubkyAppPostKind, PubkySpecsBuilder } from 'pubky-app-specs';

const userId = '8kkppkmiubfq4pxn6f73nqrhhhgkb5xyfprntc9si3np9ydbotto';
const specsBuilder = new PubkySpecsBuilder(userId);

// Create a simple post
const { post, meta } = specsBuilder.createPost(
  'Hello, Pubky world! This is my first post.',
  PubkyAppPostKind.Short,
  null,  // parent (for replies)
  null,  // embed (for reposts)
  null   // attachments
);

console.log('Post ID:', meta.id);
console.log('Post URL:', meta.url);
console.log('Post Data:', post.toJson());

// Create a reply
const { post: reply } = specsBuilder.createPost(
  'This is a reply!',
  PubkyAppPostKind.Short,
  meta.url,  // parent post
  null,
  null
);`,
        rust: `use pubky_app_specs::{PubkyAppPost, PubkyAppPostKind, TimestampId, Validatable};

// Create a post
let post = PubkyAppPost::new(
    "Hello, Pubky world! This is my first post.".to_string(),
    PubkyAppPostKind::Short,
    None,  // parent
    None,  // embed
    None   // attachments
);

// Generate ID
let post_id = post.create_id();

// Validate
post.validate(Some(&post_id))?;

// Create path
let path = PubkyAppPost::create_path(&post_id);
println!("Post path: {}", path);

// Serialize
let json = serde_json::to_string(&post)?;`,
      },
      tag: {
        javascript: `import { PubkySpecsBuilder } from 'pubky-app-specs';

const userId = '8kkppkmiubfq4pxn6f73nqrhhhgkb5xyfprntc9si3np9ydbotto';
const specsBuilder = new PubkySpecsBuilder(userId);

// Tag a post
const postUri = 'pubky://user_id/pub/pubky.app/posts/0000000000000';
const { tag, meta } = specsBuilder.createTag(postUri, 'bitcoin');

console.log('Tag ID:', meta.id);
console.log('Tag URL:', meta.url);
console.log('Tag Data:', tag.toJson());`,
        rust: `use pubky_app_specs::{PubkyAppTag, HashId, Validatable};

let tag = PubkyAppTag::new(
    "pubky://user_id/pub/pubky.app/posts/0000000000000".to_string(),
    "bitcoin".to_string()
);

let tag_id = tag.create_id();
tag.validate(Some(&tag_id))?;

let json = serde_json::to_string(&tag)?;`,
      },
      bookmark: {
        javascript: `import { PubkySpecsBuilder } from 'pubky-app-specs';

const userId = '8kkppkmiubfq4pxn6f73nqrhhhgkb5xyfprntc9si3np9ydbotto';
const specsBuilder = new PubkySpecsBuilder(userId);

const postUri = 'pubky://user_id/pub/pubky.app/posts/0000000000000';
const { bookmark, meta } = specsBuilder.createBookmark(postUri);

console.log('Bookmark ID:', meta.id);
console.log('Bookmark URL:', meta.url);`,
        rust: `use pubky_app_specs::{PubkyAppBookmark, HashId};

let bookmark = PubkyAppBookmark::new(
    "pubky://user_id/pub/pubky.app/posts/0000000000000".to_string()
);

let bookmark_id = bookmark.create_id();
let path = PubkyAppBookmark::create_path(&bookmark_id);`,
      },
      follow: {
        javascript: `import { PubkySpecsBuilder } from 'pubky-app-specs';

const userId = '8kkppkmiubfq4pxn6f73nqrhhhgkb5xyfprntc9si3np9ydbotto';
const specsBuilder = new PubkySpecsBuilder(userId);

const followUserId = 'dzswkfy7ek3bqnoc89jxuqqfbzhjrj6mi8qthgbxxcqkdugm3rio';
const { follow, meta } = specsBuilder.createFollow(followUserId);

console.log('Follow URL:', meta.url);`,
        rust: `use pubky_app_specs::PubkyAppFollow;

let follow = PubkyAppFollow::new();
let user_id = "user_to_follow_id";
let path = PubkyAppFollow::create_path(user_id);`,
      },
      file: {
        javascript: `import { PubkySpecsBuilder } from 'pubky-app-specs';

const userId = '8kkppkmiubfq4pxn6f73nqrhhhgkb5xyfprntc9si3np9ydbotto';
const specsBuilder = new PubkySpecsBuilder(userId);

// First create a blob (actual file data)
const fileData = new Uint8Array([/* file bytes */]);
const { blob, meta: blobMeta } = specsBuilder.createBlob(Array.from(fileData));

// Then create file metadata
const { file, meta } = specsBuilder.createFile(
  'my-document.pdf',
  blobMeta.url,
  'application/pdf',
  fileData.length
);

console.log('File ID:', meta.id);
console.log('File URL:', meta.url);`,
        rust: `use pubky_app_specs::{PubkyAppFile, TimestampId};

let file = PubkyAppFile::new(
    "my-document.pdf".to_string(),
    "pubky://user_id/pub/pubky.app/blobs/0000000000000".to_string(),
    "application/pdf".to_string(),
    1024 * 500  // 500KB
);

let file_id = file.create_id();
let path = PubkyAppFile::create_path(&file_id);`,
      },
      feed: {
        javascript: `import { PubkySpecsBuilder } from 'pubky-app-specs';

const userId = '8kkppkmiubfq4pxn6f73nqrhhhgkb5xyfprntc9si3np9ydbotto';
const specsBuilder = new PubkySpecsBuilder(userId);

const { feed, meta } = specsBuilder.createFeed(
  ['bitcoin', 'nostr'],  // tags
  'friends',             // reach
  'columns',             // layout
  'recent',              // sort
  'short',               // content type
  'My Bitcoin Feed'      // name
);

console.log('Feed ID:', meta.id);`,
        rust: `use pubky_app_specs::{PubkyAppFeed, PubkyAppFeedReach, PubkyAppFeedLayout, PubkyAppFeedSort};

let feed = PubkyAppFeed::new(
    Some(vec!["bitcoin".to_string(), "nostr".to_string()]),
    PubkyAppFeedReach::Friends,
    PubkyAppFeedLayout::Columns,
    PubkyAppFeedSort::Recent,
    Some("short".to_string()),
    "My Bitcoin Feed".to_string()
);`,
      },
    };

    const modelExamples = examples[modelName.toLowerCase()];
    if (!modelExamples) {
      return `No example available for model: ${modelName}`;
    }

    const code = modelExamples[language] || modelExamples.javascript;

    let output = `# ${modelName.charAt(0).toUpperCase() + modelName.slice(1)} Example\n\n`;
    output += `## ${language.charAt(0).toUpperCase() + language.slice(1)}\n\n`;
    output += `\`\`\`${language === 'rust' ? 'rust' : 'javascript'}\n${code}\n\`\`\`\n`;

    return output;
  }

  async getJavaScriptExamples(): Promise<string> {
    try {
      const examplePath = path.join(this.specsRoot, 'pkg', 'example.js');
      const exampleContent = await fs.readFile(examplePath, 'utf-8');

      let output = `# Pubky App Specs JavaScript Examples\n\n`;
      output += `Complete working example showing how to use all data models:\n\n`;
      output += `\`\`\`javascript\n${exampleContent}\n\`\`\`\n`;

      return output;
    } catch {
      return 'JavaScript examples not found';
    }
  }

  async validateModelData(modelName: string, data: any): Promise<string> {
    // This would require actually loading and running the validation
    // For now, provide validation rules
    const validationRules: Record<string, string[]> = {
      user: [
        'name: 3-50 characters, cannot be "[DELETED]"',
        'bio: max 160 characters (optional)',
        'image: valid URL, max 300 characters (optional)',
        'links: max 5 links, each with title (max 100 chars) and valid URL (max 300 chars)',
        'status: max 50 characters (optional)',
      ],
      post: [
        'content: max 2000 chars (short) or 50000 chars (long), cannot be "[DELETED]"',
        'kind: must be one of: short, long, image, video, link, file',
        'parent: must be valid URI if present',
        'embed: URI must be valid if present',
        'attachments: each must be valid URI',
      ],
      tag: [
        'uri: must be valid URI',
        'label: trimmed, lowercase, max 20 characters',
        'created_at: required timestamp',
      ],
      bookmark: [
        'uri: must be valid URI',
        'created_at: required timestamp',
      ],
      follow: ['created_at: required timestamp'],
      file: [
        'name: 1-255 characters',
        'src: must be valid URL, max 1024 characters',
        'content_type: must be valid IANA MIME type',
        'size: positive integer, max 10MB',
        'created_at: required timestamp',
      ],
    };

    const rules = validationRules[modelName.toLowerCase()] || [];

    let output = `# ${modelName} Validation\n\n`;
    output += `## Validation Rules\n\n`;

    for (const rule of rules) {
      output += `- ${rule}\n`;
    }

    output += `\n## Provided Data\n\n`;
    output += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;

    return output;
  }

  async searchModels(query: string): Promise<string> {
    await this.loadReadme();

    if (!this.readmeContent) {
      return 'README not loaded';
    }

    const queryLower = query.toLowerCase();
    const lines = this.readmeContent.split('\n');
    const matches: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(queryLower)) {
        // Include context: 2 lines before and after
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length, i + 3);
        matches.push(lines.slice(start, end).join('\n'));
      }
    }

    if (matches.length === 0) {
      return `No matches found for: ${query}`;
    }

    let output = `# Search Results for "${query}"\n\n`;
    output += `Found ${matches.length} match(es):\n\n`;

    for (let i = 0; i < Math.min(matches.length, 10); i++) {
      output += `## Match ${i + 1}\n\n${matches[i]}\n\n---\n\n`;
    }

    return output;
  }
}

