import * as assert from 'assert';
import { Config } from '../config';
import { ActiveTestProvider } from '../activeTestProvider';

suite('Unit Tests', () => {

    test('ActiveTestProvider initial state is empty', () => {
        const provider = new ActiveTestProvider();
        const children = provider.getChildren();
        assert.strictEqual(children.length, 0);
    });

    test('ActiveTestProvider shows tasks after setActiveTest', () => {
        const provider = new ActiveTestProvider();
        const testTasks = [
            { block: 'math', task: 1, name: 'math01', template: '{block}{task}.ts', testTemplate: '{block}{task}.test.ts' },
            { block: 'math', task: 2, name: 'math02' }
        ] as any[];
        
        provider.setActiveTest(testTasks, 600);
        const children = provider.getChildren();
        
        assert.strictEqual(children.length, 2);
        assert.strictEqual(children[0].label, 'math01');
        assert.strictEqual(children[1].label, 'math02');
    });

    test('ActiveTestProvider clears tasks', () => {
        const provider = new ActiveTestProvider();
        const testTasks = [
            { block: 'math', task: 1, name: 'math01' }
        ] as any[];
        
        provider.setActiveTest(testTasks, 600);
        assert.strictEqual(provider.getChildren().length, 1);
        
        provider.clearActiveTest();
        assert.strictEqual(provider.getChildren().length, 0);
    });
});