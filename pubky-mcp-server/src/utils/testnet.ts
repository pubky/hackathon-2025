/**
 * Utilities for managing Pubky testnet
 */

import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import type { TestnetInfo } from '../types.js';

const execAsync = promisify(exec);

// Hardcoded testnet configuration from pubky-testnet
const TESTNET_CONFIG = {
  homeserverPublicKey: '8pinxxgqs41n4aididenw5apqp1urfmzdztr8jt4abrkdn435ewo',
  ports: {
    dht: 6881,
    pkarrRelay: 15411,
    httpRelay: 15412,
    homeserver: 15411, // Same as pkarr relay
    adminServer: 6288,
  },
};

let testnetProcess: ChildProcess | null = null;

export class TestnetManager {
  async getInfo(): Promise<TestnetInfo> {
    const isRunning = await this.isRunning();

    return {
      isRunning,
      homeserverPublicKey: TESTNET_CONFIG.homeserverPublicKey,
      ports: TESTNET_CONFIG.ports,
      urls: {
        homeserver: `http://localhost:${TESTNET_CONFIG.ports.homeserver}`,
        admin: `http://localhost:${TESTNET_CONFIG.ports.adminServer}`,
        httpRelay: `http://localhost:${TESTNET_CONFIG.ports.httpRelay}`,
      },
    };
  }

  async isRunning(): Promise<boolean> {
    try {
      // Check if testnet is responding on HTTP relay port
      const response = await fetch(`http://localhost:${TESTNET_CONFIG.ports.httpRelay}/`, {
        signal: AbortSignal.timeout(1000),
      });
      return response.ok || response.status === 404; // 404 is ok, means server is running
    } catch {
      return false;
    }
  }

  async start(pubkyCoreRoot: string): Promise<string> {
    if (await this.isRunning()) {
      return 'Testnet is already running';
    }

    // Try to use installed binary first, then fall back to cargo run
    let command: string;
    let args: string[];
    let cwd: string | undefined;

    try {
      await execAsync('which pubky-testnet');
      command = 'pubky-testnet';
      args = [];
      cwd = undefined;
    } catch {
      // Binary not found, use cargo run
      command = 'cargo';
      args = ['run', '-p', 'pubky-testnet'];
      cwd = pubkyCoreRoot;
    }

    return new Promise((resolve, reject) => {
      testnetProcess = spawn(command, args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      let output = '';

      testnetProcess.stdout?.on('data', data => {
        output += data.toString();
      });

      testnetProcess.stderr?.on('data', data => {
        output += data.toString();
      });

      // Wait a bit for the server to start
      setTimeout(async () => {
        if (await this.isRunning()) {
          resolve(
            `Testnet started successfully!\n\nHomeserver: http://localhost:${TESTNET_CONFIG.ports.homeserver}\nHTTP Relay: http://localhost:${TESTNET_CONFIG.ports.httpRelay}\nPublic Key: ${TESTNET_CONFIG.homeserverPublicKey}\n\nThe testnet will keep running in the background.`
          );
        } else {
          reject(new Error(`Failed to start testnet. Output:\n${output}`));
        }
      }, 3000);

      testnetProcess.on('error', error => {
        reject(new Error(`Failed to start testnet: ${error.message}`));
      });
    });
  }

  async stop(): Promise<string> {
    if (!(await this.isRunning())) {
      return 'Testnet is not running';
    }

    if (testnetProcess) {
      testnetProcess.kill('SIGTERM');
      testnetProcess = null;
      return 'Testnet stopped successfully';
    }

    // Try to find and kill the process
    try {
      if (process.platform === 'win32') {
        await execAsync('taskkill /F /IM pubky-testnet.exe');
      } else {
        await execAsync('pkill -f pubky-testnet');
      }
      return 'Testnet stopped successfully';
    } catch (error) {
      return `Could not stop testnet: ${error}`;
    }
  }

  async restart(pubkyCoreRoot: string): Promise<string> {
    const stopResult = await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a second
    const startResult = await this.start(pubkyCoreRoot);
    return `${stopResult}\n${startResult}`;
  }
}
