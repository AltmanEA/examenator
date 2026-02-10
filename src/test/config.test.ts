import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import { Config, readConfig, writeConfig, createDefaultConfig } from '../config';

suite('Config Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('createDefaultConfig returns empty config', () => {
        const config = createDefaultConfig();
        assert.strictEqual(config.blocks.length, 0);
        assert.strictEqual(config.tests.length, 0);
        assert.strictEqual(config.path, 'src');
    });

    test('Config constructor sets properties correctly', () => {
        const blocks = [{ name: 'testBlock' }];
        const tests = [{ time: 600, blocks: [{ block: 'testBlock', task: 1 }] }];
        const config = new Config(blocks, tests, 'testPath');
        
        assert.deepStrictEqual(config.blocks, blocks);
        assert.deepStrictEqual(config.tests, tests);
        assert.strictEqual(config.path, 'testPath');
    });

    test('readConfig returns default config when no workspace', async () => {
        sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
        const config = await readConfig();
        assert.strictEqual(config.blocks.length, 0);
        assert.strictEqual(config.tests.length, 0);
    });

    test('writeConfig throws error when no workspace', async () => {
        sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
        const config = new Config();
        await assert.rejects(writeConfig(config), /No workspace opened/);
    });
});