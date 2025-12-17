import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { readConfig, writeConfig, Config } from '../config';
import { TasksProvider } from '../taskProvider';
import { TestsProvider } from '../testProvider';

suite('Integration Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('TasksProvider shows create config when no config file', async () => {
        // Мокаем readConfig чтобы симулировать отсутствие файла
        sandbox.stub(require('../config'), 'readConfig').rejects(new Error('File not found'));
        
        const provider = new TasksProvider();
        const children = await provider.getChildren();
        
        assert.strictEqual(children.length, 1);
        assert.strictEqual(children[0].label, 'Создать конфигурацию');
    });

    test('TasksProvider shows blocks from config', async () => {
        const testConfig = new Config([
            { name: 'block1', task: 3 },
            { name: 'block2', task: 5 }
        ]);
        
        sandbox.stub(require('../config'), 'readConfig').resolves(testConfig);
        
        const provider = new TasksProvider();
        const children = await provider.getChildren();
        
        assert.strictEqual(children.length, 2);
        assert.strictEqual(children[0].label, 'block1 (задач: 3)');
        assert.strictEqual(children[1].label, 'block2 (задач: 5)');
    });

    test('TestsProvider shows tests from config', async () => {
        const testConfig = new Config([], [
            { time: 600, blocks: [{ block: 'block1', task: 2 }] },
            { time: 300, blocks: [{ block: 'block2', task: 1 }] }
        ]);
        
        sandbox.stub(require('../config'), 'readConfig').resolves(testConfig);
        
        const provider = new TestsProvider();
        const children = await provider.getChildren();
        
        assert.strictEqual(children.length, 2);
        assert.strictEqual(children[0].label, 'Тест 1 (600 сек)');
        assert.strictEqual(children[1].label, 'Тест 2 (300 сек)');
    });

    test('TestsProvider returns empty array when no config', async () => {
        sandbox.stub(require('../config'), 'readConfig').rejects(new Error('File not found'));
        
        const provider = new TestsProvider();
        const children = await provider.getChildren();
        
        assert.strictEqual(children.length, 0);
    });
});