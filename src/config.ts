import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export type Block = {
  name: string;
  task: number;
  template?: string;
  testTemplate?: string;
};
export type Tests = {
  time: number;
  blocks: {
    block: string;
    task: number;
  }[];
};


export class Config {
  blocks: Block[];
  tests: Tests[];

  constructor(blocks: Block[] = [], tests: Tests[] = []) {
    this.blocks = blocks;
    this.tests = tests;
  }
}

const CONFIG_FILE = 'config.json';

export async function readConfig(): Promise<Config> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return new Config();
    }

    const configPath = path.join(workspaceFolder.uri.fsPath, CONFIG_FILE);
    
    try {
        const data = await fs.readFile(configPath, 'utf-8');
        const json = JSON.parse(data);
        return new Config(json.blocks || [], json.tests || []);
    } catch {
        return createDefaultConfig();
    }
}

export async function writeConfig(config: Config): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace opened');
    }

    const configPath = path.join(workspaceFolder.uri.fsPath, CONFIG_FILE);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export function createDefaultConfig(): Config {
    return new Config([], []);
}
