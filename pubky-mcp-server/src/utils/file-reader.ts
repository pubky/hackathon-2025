/**
 * Utilities for reading files from the Pubky ecosystem repositories
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PubkyCorePaths, PkarrPaths, PkdnsPaths, NexusPaths } from '../types.js';
import { SEARCH_FILE_EXTENSIONS, IGNORED_DIRECTORIES } from '../constants.js';

export class FileReader {
  private paths: PubkyCorePaths;
  private pkarrPaths: PkarrPaths | null = null;
  private pkdnsPaths: PkdnsPaths | null = null;
  private nexusPaths: NexusPaths | null = null;

  constructor(
    pubkyCoreRoot: string,
    pkarrRoot?: string,
    pkdnsRoot?: string,
    nexusRoot?: string
  ) {
    this.paths = {
      root: pubkyCoreRoot,
      docs: path.join(pubkyCoreRoot, 'docs'),
      examples: path.join(pubkyCoreRoot, 'examples'),
      examplesRust: path.join(pubkyCoreRoot, 'examples', 'rust'),
      examplesJs: path.join(pubkyCoreRoot, 'examples', 'javascript'),
    };

    if (pkarrRoot) {
      this.pkarrPaths = {
        root: pkarrRoot,
        design: path.join(pkarrRoot, 'design'),
        examples: path.join(pkarrRoot, 'pkarr', 'examples'),
        bindingsJs: path.join(pkarrRoot, 'bindings', 'js'),
        relay: path.join(pkarrRoot, 'relay'),
      };
    }

    if (pkdnsRoot) {
      this.pkdnsPaths = {
        root: pkdnsRoot,
        docs: path.join(pkdnsRoot, 'docs'),
        cli: path.join(pkdnsRoot, 'cli'),
        serverConfig: path.join(pkdnsRoot, 'server', 'config.sample.toml'),
      };
    }

    if (nexusRoot) {
      this.nexusPaths = {
        root: nexusRoot,
        docs: path.join(nexusRoot, 'docs'),
        examples: path.join(nexusRoot, 'examples'),
        componentReadmes: {
          common: path.join(nexusRoot, 'nexus-common', 'README.md'),
          watcher: path.join(nexusRoot, 'nexus-watcher', 'README.md'),
          webapi: path.join(nexusRoot, 'nexus-webapi', 'README.md'),
        },
      };
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readDocFile(relativePath: string): Promise<string> {
    const fullPath = path.join(this.paths.docs, relativePath);
    return this.readFile(fullPath);
  }

  async readExampleFile(language: 'rust' | 'javascript', relativePath: string): Promise<string> {
    const basePath = language === 'rust' ? this.paths.examplesRust : this.paths.examplesJs;
    const fullPath = path.join(basePath, relativePath);
    return this.readFile(fullPath);
  }

  async readPkarrDesignDoc(docName: string): Promise<string> {
    if (!this.pkarrPaths) {
      throw new Error('Pkarr paths not initialized');
    }
    const fullPath = path.join(this.pkarrPaths.design, `${docName}.md`);
    return this.readFile(fullPath);
  }

  async readPkarrExample(exampleName: string): Promise<string> {
    if (!this.pkarrPaths) {
      throw new Error('Pkarr paths not initialized');
    }
    const fullPath = path.join(this.pkarrPaths.examples, `${exampleName}.rs`);
    return this.readFile(fullPath);
  }

  async readPkarrJsBindings(relativePath: string): Promise<string> {
    if (!this.pkarrPaths) {
      throw new Error('Pkarr paths not initialized');
    }
    const fullPath = path.join(this.pkarrPaths.bindingsJs, relativePath);
    return this.readFile(fullPath);
  }

  async readPkarrRelayConfig(): Promise<string> {
    if (!this.pkarrPaths) {
      throw new Error('Pkarr paths not initialized');
    }
    const fullPath = path.join(this.pkarrPaths.relay, 'src', 'config.example.toml');
    return this.readFile(fullPath);
  }

  async readPkarrFile(relativePath: string): Promise<string> {
    if (!this.pkarrPaths) {
      throw new Error('Pkarr paths not initialized');
    }
    const fullPath = path.join(this.pkarrPaths.root, relativePath);
    return this.readFile(fullPath);
  }

  async listDirectory(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.map(entry => entry.name);
    } catch (error) {
      throw new Error(`Failed to list directory ${dirPath}: ${error}`);
    }
  }

  async searchFiles(
    dirPath: string,
    query: string
  ): Promise<Array<{ path: string; matches: string[] }>> {
    const results: Array<{ path: string; matches: string[] }> = [];
    const queryLower = query.toLowerCase();

    async function searchRecursive(currentPath: string) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        switch (true) {
          case entry.isDirectory(): {
            // Skip node_modules, .git, etc.
            if (!IGNORED_DIRECTORIES.includes(entry.name as any)) {
              await searchRecursive(fullPath);
            }
            break;
          }
          case entry.isFile() && SEARCH_FILE_EXTENSIONS.some(ext => entry.name.endsWith(ext)): {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const lines = content.split('\n');
              const matches: string[] = [];

              lines.forEach((line, index) => {
                if (line.toLowerCase().includes(queryLower)) {
                  matches.push(`Line ${index + 1}: ${line.trim()}`);
                }
              });

              if (matches.length > 0) {
                results.push({ path: fullPath, matches: matches.slice(0, 5) }); // Limit to 5 matches per file
              }
            } catch {
              // Skip files that can't be read
            }
            break;
          }
        }
      }
    }

    await searchRecursive(dirPath);
    return results;
  }

  getPaths(): PubkyCorePaths {
    return this.paths;
  }

  getPkarrPaths(): PkarrPaths | null {
    return this.pkarrPaths;
  }

  async readPkdnsDoc(docName: string): Promise<string> {
    if (!this.pkdnsPaths) {
      throw new Error('Pkdns paths not initialized');
    }
    const fullPath = path.join(this.pkdnsPaths.docs, `${docName}.md`);
    return this.readFile(fullPath);
  }

  async readPkdnsFile(relativePath: string): Promise<string> {
    if (!this.pkdnsPaths) {
      throw new Error('Pkdns paths not initialized');
    }
    const fullPath = path.join(this.pkdnsPaths.root, relativePath);
    return this.readFile(fullPath);
  }

  getPkdnsPaths(): PkdnsPaths | null {
    return this.pkdnsPaths;
  }

  async readNexusDoc(docName: string): Promise<string> {
    if (!this.nexusPaths) {
      throw new Error('Nexus paths not initialized');
    }
    const fullPath = path.join(this.nexusPaths.docs, docName);
    return this.readFile(fullPath);
  }

  async readNexusComponentReadme(component: 'common' | 'watcher' | 'webapi'): Promise<string> {
    if (!this.nexusPaths) {
      throw new Error('Nexus paths not initialized');
    }
    const fullPath = this.nexusPaths.componentReadmes[component];
    return this.readFile(fullPath);
  }

  async readNexusFile(relativePath: string): Promise<string> {
    if (!this.nexusPaths) {
      throw new Error('Nexus paths not initialized');
    }
    const fullPath = path.join(this.nexusPaths.root, relativePath);
    return this.readFile(fullPath);
  }

  getNexusPaths(): NexusPaths | null {
    return this.nexusPaths;
  }
}
