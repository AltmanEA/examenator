import * as assert from 'assert';
import * as sinon from 'sinon';
import { TestsProvider } from '../testProvider';

suite('TestProvider Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('getTreeItem returns the same element', () => {
        const provider = new TestsProvider();
        const item = { label: 'test' } as any;
        assert.strictEqual(provider.getTreeItem(item), item);
    });

    test('refresh fires onDidChangeTreeData event', () => {
        const provider = new TestsProvider();
        let eventFired = false;
        provider.onDidChangeTreeData(() => {
            eventFired = true;
        });
        
        provider.refresh();
        assert.strictEqual(eventFired, true);
    });
});