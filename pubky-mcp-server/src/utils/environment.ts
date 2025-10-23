/**
 * Utilities for detecting and managing development environment
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { EnvironmentInfo, ProjectAnalysis } from '../types.js';
import { PROJECT_TYPES, FRAMEWORKS } from '../constants.js';

const execAsync = promisify(exec);

export class EnvironmentDetector {
  async detect(): Promise<EnvironmentInfo> {
    const info: EnvironmentInfo = {
      os: os.platform(),
      arch: os.arch(),
    };

    // Check Node.js
    try {
      const { stdout: nodeVersion } = await execAsync('node --version');
      const { stdout: nodePath } = await execAsync(
        process.platform === 'win32' ? 'where node' : 'which node'
      );
      info.node = {
        version: nodeVersion.trim(),
        path: nodePath.trim().split('\n')[0],
      };
    } catch {
      // Node not found
    }

    // Check npm
    try {
      const { stdout: npmVersion } = await execAsync('npm --version');
      const { stdout: npmPath } = await execAsync(
        process.platform === 'win32' ? 'where npm' : 'which npm'
      );
      info.npm = {
        version: npmVersion.trim(),
        path: npmPath.trim().split('\n')[0],
      };
    } catch {
      // npm not found
    }

    // Check Rust
    try {
      const { stdout: rustVersion } = await execAsync('rustc --version');
      const { stdout: rustPath } = await execAsync(
        process.platform === 'win32' ? 'where rustc' : 'which rustc'
      );
      info.rust = {
        version: rustVersion.trim(),
        path: rustPath.trim().split('\n')[0],
      };
    } catch {
      // Rust not found
    }

    // Check Cargo
    try {
      const { stdout: cargoVersion } = await execAsync('cargo --version');
      const { stdout: cargoPath } = await execAsync(
        process.platform === 'win32' ? 'where cargo' : 'which cargo'
      );
      info.cargo = {
        version: cargoVersion.trim(),
        path: cargoPath.trim().split('\n')[0],
      };
    } catch {
      // Cargo not found
    }

    // Check pubky-testnet
    try {
      const { stdout: testnetPath } = await execAsync(
        process.platform === 'win32' ? 'where pubky-testnet' : 'which pubky-testnet'
      );
      info.pubkyTestnet = {
        installed: true,
        path: testnetPath.trim().split('\n')[0],
      };
    } catch {
      info.pubkyTestnet = {
        installed: false,
      };
    }

    return info;
  }

  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    const analysis: ProjectAnalysis = {
      type: 'unknown',
      hasPackageJson: false,
      hasCargoToml: false,
      hasPubkyDependency: false,
      dependencies: [],
      devDependencies: [],
    };

    // Check for package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      analysis.hasPackageJson = true;
      analysis.type = packageJson.devDependencies?.typescript
        ? PROJECT_TYPES.TYPESCRIPT
        : PROJECT_TYPES.JAVASCRIPT;

      analysis.dependencies = Object.keys(packageJson.dependencies || {});
      analysis.devDependencies = Object.keys(packageJson.devDependencies || {});

      if (analysis.dependencies.includes('@synonymdev/pubky')) {
        analysis.hasPubkyDependency = true;
      }

      // Detect framework
      switch (true) {
        case analysis.dependencies.includes('react') || analysis.dependencies.includes('next'):
          analysis.framework = FRAMEWORKS.REACT;
          break;
        case analysis.dependencies.includes('vue'):
          analysis.framework = FRAMEWORKS.VUE;
          break;
        case analysis.dependencies.includes('svelte'):
          analysis.framework = FRAMEWORKS.SVELTE;
          break;
      }
    } catch {
      // No package.json or invalid
    }

    // Check for Cargo.toml
    const cargoTomlPath = path.join(projectPath, 'Cargo.toml');
    try {
      const cargoToml = await fs.readFile(cargoTomlPath, 'utf-8');
      analysis.hasCargoToml = true;
      analysis.type = PROJECT_TYPES.RUST;

      if (cargoToml.includes('pubky') || cargoToml.includes('pubky-sdk')) {
        analysis.hasPubkyDependency = true;
      }

      // Extract dependencies
      const depsMatch = cargoToml.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
      if (depsMatch) {
        const deps = depsMatch[1].match(/^(\w+(-\w+)*)\s*=/gm);
        if (deps) {
          analysis.dependencies = deps.map(d => d.split('=')[0].trim());
        }
      }
    } catch {
      // No Cargo.toml or invalid
    }

    return analysis;
  }

  async installPubkyTestnet(): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync('cargo install pubky-testnet', {
        timeout: 300000, // 5 minutes timeout
      });
      return `Successfully installed pubky-testnet:\n${stdout}\n${stderr}`;
    } catch (error: any) {
      throw new Error(`Failed to install pubky-testnet: ${error.message}`);
    }
  }

  async installNpmPackage(
    projectPath: string,
    packageName: string = '@synonymdev/pubky'
  ): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(`npm install ${packageName}`, {
        cwd: projectPath,
        timeout: 120000, // 2 minutes timeout
      });
      return `Successfully installed ${packageName}:\n${stdout}\n${stderr}`;
    } catch (error: any) {
      throw new Error(`Failed to install ${packageName}: ${error.message}`);
    }
  }

  async addCargodependency(
    projectPath: string,
    dependency: string = 'pubky',
    version?: string
  ): Promise<string> {
    const cargoTomlPath = path.join(projectPath, 'Cargo.toml');

    try {
      let cargoToml = await fs.readFile(cargoTomlPath, 'utf-8');

      // Find the dependencies section or create it
      const depString = version ? `${dependency} = "${version}"` : `${dependency} = "0.4"`;

      if (cargoToml.includes('[dependencies]')) {
        // Add after [dependencies]
        cargoToml = cargoToml.replace('[dependencies]', `[dependencies]\n${depString}`);
      } else {
        // Add new dependencies section
        cargoToml += `\n\n[dependencies]\n${depString}\n`;
      }

      await fs.writeFile(cargoTomlPath, cargoToml, 'utf-8');
      return `Successfully added ${dependency} to Cargo.toml`;
    } catch (error: any) {
      throw new Error(`Failed to add dependency to Cargo.toml: ${error.message}`);
    }
  }
}
