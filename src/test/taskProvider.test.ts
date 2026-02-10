import * as assert from 'assert';
import * as sinon from 'sinon';
import { TasksProvider } from '../taskProvider';
import { Config } from '../config';

suite('TaskProvider Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getTreeItem returns the same element', () => {
        const provider = new TasksProvider();
        const item = { label: 'test' } as any;
        assert.strictEqual(provider.getTreeItem(item), item);
    });

    test('refresh fires onDidChangeTreeData event', () => {
        const provider = new TasksProvider();
        let eventFired = false;
        provider.onDidChangeTreeData(() => {
            eventFired = true;
        });
        
        provider.refresh();
        assert.strictEqual(eventFired, true);
    });
});