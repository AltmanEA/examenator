import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { readConfig, readConfigOrDefault, writeConfig, createDefaultConfig, clearConfigCache } from '../config';

// Вспомогательная функция: создаёт временную папку с (или без) config.json
async function makeTempFolderWithConfig(content: string | null): Promise<vscode.WorkspaceFolder> {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'examenator-test-'));
    if (content !== null) {
        await fsp.writeFile(path.join(dir, 'config.json'), content, 'utf-8');
    }
    return { uri: vscode.Uri.file(dir), name: 'tmp', index: 0 };
}

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
        const config = { blocks, tests, path: 'testPath' };
        
        assert.deepStrictEqual(config.blocks, blocks);
        assert.deepStrictEqual(config.tests, tests);
        assert.strictEqual(config.path, 'testPath');
    });

    test('readConfig throws error when no workspace', async () => {
        sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
        await assert.rejects(readConfig(), /Не открыта рабочая папка/);
    });

    test('readConfigOrDefault returns default config when no workspace', async () => {
        sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
        const config = await readConfigOrDefault();
        assert.strictEqual(config.blocks.length, 0);
        assert.strictEqual(config.tests.length, 0);
    });

    test('writeConfig throws error when no workspace', async () => {
        sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
        const config = { blocks: [], tests: [], path: 'src' };
        await assert.rejects(writeConfig(config), /No workspace opened/);
    });

    test('readConfig returns parsed config when file exists', async () => {
        clearConfigCache();
        const folder = await makeTempFolderWithConfig(
            JSON.stringify({ blocks: [{ name: 'b1' }], tests: [{ time: 60, blocks: [{ block: 'b1', task: 1 }] }], path: 'src' })
        );

        const config = await readConfig(folder);
        assert.strictEqual(config.blocks.length, 1);
        assert.strictEqual(config.tests.length, 1);
        assert.strictEqual(config.path, 'src');
    });

    test('readConfig throws when file read fails and no cache', async () => {
        clearConfigCache();
        // Папка без config.json — чтение файла завершится ошибкой
        const folder = await makeTempFolderWithConfig(null);

        await assert.rejects(readConfig(folder), /Не удалось прочитать config.json/);
    });

    test('readConfig throws on invalid JSON', async () => {
        clearConfigCache();
        const folder = await makeTempFolderWithConfig('{ bad json');

        await assert.rejects(readConfig(folder), /невалидный JSON/);
    });

    test('readConfig uses cache when file read fails', async () => {
        clearConfigCache();
        const folder = await makeTempFolderWithConfig(
            JSON.stringify({ blocks: [{ name: 'cached' }], tests: [], path: 'src' })
        );

        // Первый вызов — чтение из файла
        const c1 = await readConfig(folder);
        assert.strictEqual(c1.blocks.length, 1);

        // Удаляем файл — второе чтение упадёт, но должен вернуть кэш
        await fsp.rm(path.join(folder.uri.fsPath, 'config.json'));
        const c2 = await readConfig(folder);
        assert.strictEqual(c2.blocks.length, 1);
        assert.strictEqual(c2.blocks[0].name, 'cached');
    });

    test('clearConfigCache disables cached fallback', async () => {
        clearConfigCache();
        const folder = await makeTempFolderWithConfig(
            JSON.stringify({ blocks: [{ name: 'cached' }], tests: [], path: 'src' })
        );

        const c1 = await readConfig(folder);
        assert.strictEqual(c1.blocks.length, 1);

        await fsp.rm(path.join(folder.uri.fsPath, 'config.json'));
        clearConfigCache();
        await assert.rejects(readConfig(folder), /Не удалось прочитать config.json/);
    });
});