import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

suite('Command Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('examView.selectBlock command exists', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('examView.selectBlock'));
    });

    test('examView.openTaskAndTest command exists', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('examView.openTaskAndTest'));
    });
});