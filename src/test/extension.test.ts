import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Tests', () => {
    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('AltmanEA.examenator'));
    });

    test('Extension should activate', async () => {
        const ext = vscode.extensions.getExtension('AltmanEA.examenator');
        assert.ok(ext);
        await ext!.activate();
        assert.strictEqual(ext!.isActive, true);
    });
});