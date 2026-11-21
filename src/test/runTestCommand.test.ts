import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { runTestHandler } from '../activeTestProvider';
import { ActiveTestProvider } from '../activeTestProvider';

suite('runTestHandler Tests', () => {
    let sandbox: sinon.SinonSandbox;
    let showErrorMessageStub: sinon.SinonStub;
    let setActiveTestStub: sinon.SinonStub;
    let fakeProvider: ActiveTestProvider;
    let workspaceFolder: vscode.WorkspaceFolder;

    setup(() => {
        sandbox = sinon.createSandbox();
        showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
        showErrorMessageStub.resolves(undefined);

        workspaceFolder = {
            uri: vscode.Uri.file('/test-workspace'),
            name: 'test-workspace',
            index: 0
        };
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([workspaceFolder]);

        setActiveTestStub = sandbox.stub();
        fakeProvider = {
            setActiveTest: setActiveTestStub
        } as unknown as ActiveTestProvider;
    });

    teardown(() => {
        sandbox.restore();
    });

    // Валидация индекса выполняется после чтения конфига,
    // поэтому в этих тестах readConfig всегда успешен
    function stubValidConfig() {
        sandbox.stub(require('../config'), 'readConfig').resolves({
            blocks: [{ name: 'block1' }],
            tests: [{ time: 60, blocks: [{ block: 'block1', task: 1 }] }],
            path: 'src'
        });
    }

    test('rejects when testIndex is undefined', async () => {
        stubValidConfig();
        await runTestHandler(fakeProvider, undefined as unknown as number);
        assert.ok(showErrorMessageStub.calledWithMatch(/некорректный номер теста/));
        assert.strictEqual(setActiveTestStub.callCount, 0);
    });

    test('rejects when testIndex is negative', async () => {
        stubValidConfig();
        await runTestHandler(fakeProvider, -1);
        assert.ok(showErrorMessageStub.calledWithMatch(/некорректный номер теста/));
        assert.strictEqual(setActiveTestStub.callCount, 0);
    });

    test('rejects when testIndex is a float', async () => {
        stubValidConfig();
        await runTestHandler(fakeProvider, 1.5);
        assert.ok(showErrorMessageStub.calledWithMatch(/некорректный номер теста/));
        assert.strictEqual(setActiveTestStub.callCount, 0);
    });

    test('rejects when testIndex is a string', async () => {
        stubValidConfig();
        await runTestHandler(fakeProvider, 'abc' as unknown as number);
        assert.ok(showErrorMessageStub.calledWithMatch(/некорректный номер теста/));
        assert.strictEqual(setActiveTestStub.callCount, 0);
    });

    test('rejects when testIndex is out of range', async () => {
        const testConfig = {
            blocks: [{ name: 'block1' }],
            tests: [{ time: 60, blocks: [{ block: 'block1', task: 1 }] }],
            path: 'src'
        };
        sandbox.stub(require('../config'), 'readConfig').resolves(testConfig);

        await runTestHandler(fakeProvider, 5);
        assert.ok(showErrorMessageStub.calledWithMatch(/тест №6 не найден/));
        assert.ok(showErrorMessageStub.calledWithMatch(/доступно тестов: 1/));
        assert.strictEqual(setActiveTestStub.callCount, 0);
    });

    test('rejects when test.blocks is not an array', async () => {
        const testConfig = {
            blocks: [{ name: 'block1' }],
            tests: [{ time: 60, blocks: null }],
            path: 'src'
        };
        sandbox.stub(require('../config'), 'readConfig').resolves(testConfig);

        await runTestHandler(fakeProvider, 0);
        assert.ok(showErrorMessageStub.calledWithMatch(/не заданы блоки/));
        assert.strictEqual(setActiveTestStub.callCount, 0);
    });

    test('rejects when readConfig throws', async () => {
        sandbox.stub(require('../config'), 'readConfig').rejects(new Error('File not found'));

        await runTestHandler(fakeProvider, 0);
        assert.ok(showErrorMessageStub.calledWithMatch(/Не удалось запустить тест/));
        assert.ok(showErrorMessageStub.calledWithMatch(/File not found/));
        assert.strictEqual(setActiveTestStub.callCount, 0);
    });

    test('successfully runs test with valid config', async () => {
        const testConfig = {
            blocks: [
                { name: 'block1', tasks: ['task1', 'task2', 'task3'] },
                { name: 'block2', task: 2 }
            ],
            tests: [
                { time: 300, blocks: [{ block: 'block1', task: 2 }, { block: 'block2', task: 1 }] }
            ],
            path: 'src'
        };
        sandbox.stub(require('../config'), 'readConfig').resolves(testConfig);

        await runTestHandler(fakeProvider, 0);

        // setActiveTest должна быть вызвана ровно 1 раз
        assert.ok(setActiveTestStub.calledOnce);
        const args = setActiveTestStub.firstCall.args;
        assert.strictEqual(args[1], 300); // время теста
        // Количество выбранных задач: 2 из block1 + 1 из block2 = 3
        assert.strictEqual(args[0].length, 3);
    });

    test('handles empty block selection gracefully', async () => {
        const testConfig = {
            blocks: [],
            tests: [{ time: 60, blocks: [{ block: 'missing', task: 1 }] }],
            path: 'src'
        };
        sandbox.stub(require('../config'), 'readConfig').resolves(testConfig);

        await runTestHandler(fakeProvider, 0);

        // setActiveTest вызвана, но tasks пустой — блок не найден
        assert.ok(setActiveTestStub.calledOnce);
        const tasks = setActiveTestStub.firstCall.args[0];
        assert.strictEqual(tasks.length, 0);
    });

    // Inline-кнопка в дереве (menu view/item/context без arguments) передаёт
    // сам элемент дерева вместо индекса — индекс берётся из поля index
    test('runs test when argument is a tree item with index', async () => {
        const testConfig = {
            blocks: [
                { name: 'block1', tasks: ['task1', 'task2', 'task3'] },
                { name: 'block2', tasks: ['taskA', 'taskB'] }
            ],
            tests: [
                { time: 60, blocks: [{ block: 'block1', task: 1 }] },
                { time: 300, blocks: [{ block: 'block2', task: 2 }] }
            ],
            path: 'src'
        };
        sandbox.stub(require('../config'), 'readConfig').resolves(testConfig);

        await runTestHandler(fakeProvider, { index: 1, test: {}, contextValue: 'test' });

        assert.ok(setActiveTestStub.calledOnce);
        const args = setActiveTestStub.firstCall.args;
        // Использован второй тест (index: 1), а не первый
        assert.strictEqual(args[1], 300);
        assert.strictEqual(args[0].length, 2);
    });

    test('rejects when tree item argument has no index', async () => {
        stubValidConfig();
        await runTestHandler(fakeProvider, { contextValue: 'test' });
        assert.ok(showErrorMessageStub.calledWithMatch(/некорректный номер теста/));
        assert.strictEqual(setActiveTestStub.callCount, 0);
    });

    test('rejects when tree item index is not a number', async () => {
        stubValidConfig();
        await runTestHandler(fakeProvider, { index: '0' });
        assert.ok(showErrorMessageStub.calledWithMatch(/некорректный номер теста/));
        assert.strictEqual(setActiveTestStub.callCount, 0);
    });
});
