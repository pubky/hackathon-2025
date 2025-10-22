/**
 * Utilities for reading files from the pubky-core repository
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { PubkyCorePaths } from '../types.js';
import { SEARCH_FILE_EXTENSIONS, IGNORED_DIRECTORIES } from '../constants.js';

export class FileReader {
  private paths: PubkyCorePaths;

  constructor(pubkyCoreRoot: string) {
    this.paths = {
      root: pubkyCoreRoot,
      docs: path.join(pubkyCoreRoot, 'docs'),
      examples: path.join(pubkyCoreRoot, 'examples'),
      examplesRust: path.join(pubkyCoreRoot, 'examples', 'rust'),
      examplesJs: path.join(pubkyCoreRoot, 'examples', 'javascript'),
    };
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
}
