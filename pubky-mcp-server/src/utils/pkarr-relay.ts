/**
 * Utilities for managing Pkarr relay
 */

import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { PkarrRelayInfo, PkarrRelayConfig } from '../types.js';
import { PKARR_RELAY_DEFAULT_PORT } from '../constants.js';

const execAsync = promisify(exec);

let relayProcess: ChildProcess | null = null;
let currentConfig: PkarrRelayConfig = {};

export class PkarrRelayManager {
  private pkarrRoot: string;

  constructor(pkarrRoot: string) {
    this.pkarrRoot = pkarrRoot;
  }

  async getInfo(): Promise<PkarrRelayInfo> {
    const running = await this.isRunning();
    const port = currentConfig.port || PKARR_RELAY_DEFAULT_PORT;

    return {
      running,
      port: running ? port : undefined,
      cacheLocation: currentConfig.cachePath,
      url: running ? `http://localhost:${port}` : undefined,
      testnet: currentConfig.testnet,
    };
  }

  async isRunning(): Promise<boolean> {
    try {
      const port = currentConfig.port || PKARR_RELAY_DEFAULT_PORT;
      // Try to fetch from the relay
      const response = await fetch(`http://localhost:${port}/`, {
        signal: AbortSignal.timeout(1000),
      });
      // Relay may return 404 for root path, which is fine
      return response.status === 404 || response.ok;
    } catch {
      return false;
    }
  }

  async start(config: PkarrRelayConfig = {}): Promise<string> {
    if (await this.isRunning()) {
      return 'Pkarr relay is already running';
    }

    // Store config
    currentConfig = config;

    const port = config.port || PKARR_RELAY_DEFAULT_PORT;
    const cachePath = config.cachePath || join(tmpdir(), 'pkarr-cache');

    // Create config file
    const configContent = this.generateConfigFile(config);
    const configDir = join(tmpdir(), 'pkarr-relay-config');
    await mkdir(configDir, { recursive: true });
    const configFilePath = join(configDir, 'config.toml');
    await writeFile(configFilePath, configContent);

    // Try to use installed binary first, then fall back to cargo run
    let command: string;
    let args: string[];
    let cwd: string | undefined;

    try {
      await execAsync('which pkarr-relay');
      command = 'pkarr-relay';
      args = ['--config', configFilePath];
      if (config.testnet) {
        args.push('--testnet');
      }
      cwd = undefined;
    } catch {
      // Binary not found, use cargo run from the pkarr repository
      command = 'cargo';
      args = ['run', '--release', '--manifest-path', join(this.pkarrRoot, 'relay/Cargo.toml')];
      if (config.testnet) {
        args.push('--', '--testnet');
      } else {
        args.push('--', '--config', configFilePath);
      }
      cwd = this.pkarrRoot;
    }

    return new Promise((resolve, reject) => {
      relayProcess = spawn(command, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      let output = '';

      relayProcess.stdout?.on('data', data => {
        output += data.toString();
      });

      relayProcess.stderr?.on('data', data => {
        output += data.toString();
      });

      // Wait for the relay to start
      setTimeout(async () => {
        if (await this.isRunning()) {
          const mode = config.testnet ? 'testnet mode' : 'production mode';
          resolve(
            `Pkarr relay started successfully in ${mode}!\n\nURL: http://localhost:${port}\nCache: ${cachePath}\n\nThe relay will keep running in the background.`
          );
        } else {
          reject(new Error(`Failed to start Pkarr relay. Output:\n${output}`));
        }
      }, 3000);

      relayProcess.on('error', error => {
        reject(new Error(`Failed to start Pkarr relay: ${error.message}`));
      });
    });
  }

  async stop(): Promise<string> {
    if (!(await this.isRunning())) {
      return 'Pkarr relay is not running';
    }

    if (relayProcess) {
      relayProcess.kill('SIGTERM');
      relayProcess = null;
      currentConfig = {};
      return 'Pkarr relay stopped successfully';
    }

    // Try to find and kill the process
    try {
      if (process.platform === 'win32') {
        await execAsync('taskkill /F /IM pkarr-relay.exe');
      } else {
        await execAsync('pkill -f pkarr-relay');
      }
      currentConfig = {};
      return 'Pkarr relay stopped successfully';
    } catch (error) {
      return `Could not stop Pkarr relay: ${error}`;
    }
  }

  async restart(config?: PkarrRelayConfig): Promise<string> {
    const stopResult = await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second
    const startResult = await this.start(config || currentConfig);
    return `${stopResult}\n${startResult}`;
  }

  private generateConfigFile(config: PkarrRelayConfig): string {
    const port = config.port || PKARR_RELAY_DEFAULT_PORT;
    const cachePath = config.cachePath || join(tmpdir(), 'pkarr-cache');
    const cacheSize = config.cacheSize || 1_000_000;
    const minimumTtl = config.minimumTtl || 300;
    const maximumTtl = config.maximumTtl || 86400;

    let configContent = `# HTTP server configurations.
[http]
# The port number to run the HTTP server on. 
port = ${port}

# Internal Mainline node configurations
[mainline]
# Port to run the internal Mainline DHT node on.
port = ${port}

# Cache settings
[cache]
# Set the path for the cache storage.
path = "${cachePath}"
# Maximum number of SignedPackets to store, before evicting the oldest packets.
size = ${cacheSize}

# Minimum TTL before attempting to lookup a more recent version of a SignedPacket 
minimum_ttl = ${minimumTtl}
# Maximum TTL before attempting to lookup a more recent version of a SignedPacket 
maximum_ttl = ${maximumTtl}
`;

    if (config.rateLimiter) {
      configContent += `
# Ip rate limiting configurations.
[rate_limiter]
# Set to true if you are running this relay behind a reverse proxy
behind_proxy = ${config.rateLimiter.behindProxy}
# Maximum number of requests per second.
burst_size = ${config.rateLimiter.burstSize}
# Number of seconds after which one request of the quota is replenished.
per_second = ${config.rateLimiter.perSecond}
`;
    }

    return configContent;
  }
}

