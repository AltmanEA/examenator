import * as assert from 'assert';
import * as sinon from 'sinon';
import { ActiveTestProvider } from '../activeTestProvider';

suite('Error Handling Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('ActiveTestProvider handles empty tasks correctly', () => {
        const provider = new ActiveTestProvider();
        const children = provider.getChildren();
        assert.strictEqual(children.length, 0);
    });

    test('ActiveTestProvider clearActiveTest works when already empty', () => {
        const provider = new ActiveTestProvider();
        provider.clearActiveTest();
        const children = provider.getChildren();
        assert.strictEqual(children.length, 0);
    });
});