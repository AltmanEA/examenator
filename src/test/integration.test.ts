import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { readConfig, writeConfig } from '../config';
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

    test('TasksProvider shows message when no config file', async () => {
        // Мокаем readConfig чтобы симулировать отсутствие файла
        sandbox.stub(require('../config'), 'readConfig').rejects(new Error('File not found'));
        
        const provider = new TasksProvider();
        const children = await provider.getChildren();
        
        assert.strictEqual(children.length, 0);
    });

    test('TasksProvider shows blocks from config', async () => {
        const testConfig = {
            blocks: [
                { name: 'block1', tasks: ['task1', 'task2'] },
                { name: 'block2', tasks: ['task1', 'task2', 'task3'] }
            ],
            tests: [],
            path: 'src'
        };
        
        sandbox.stub(require('../config'), 'readConfig').resolves(testConfig);
        
        const provider = new TasksProvider();
        const children = await provider.getChildren();
        
        assert.strictEqual(children.length, 2);
        assert.strictEqual(children[0].label, 'block1 (задач: 2)');
        assert.strictEqual(children[1].label, 'block2 (задач: 3)');
    });

    test('TestsProvider shows tests from config', async () => {
        const testConfig = {
            blocks: [],
            tests: [
                { time: 600, blocks: [{ block: 'block1', task: 2 }] },
                { time: 300, blocks: [{ block: 'block2', task: 1 }] }
            ],
            path: 'src'
        };
        
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