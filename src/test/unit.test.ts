import * as assert from 'assert';
import { Config } from '../config';
import { ActiveTestProvider } from '../activeTestProvider';

suite('Unit Tests', () => {
    test('Config constructor creates empty arrays', () => {
        const config = new Config();
        assert.strictEqual(config.blocks.length, 0);
        assert.strictEqual(config.tests.length, 0);
    });

    test('Config stores block data correctly', () => {
        const blocks = [
            { name: 'block1', task: 3, template: '{block}_{task}.ts', testTemplate: 'test_{block}_{task}.ts' },
            { name: 'block2', task: 5 }
        ];
        const config = new Config(blocks, []);
        
        assert.strictEqual(config.blocks.length, 2);
        assert.strictEqual(config.blocks[0].name, 'block1');
        assert.strictEqual(config.blocks[0].task, 3);
        assert.strictEqual(config.blocks[0].template, '{block}_{task}.ts');
        assert.strictEqual(config.blocks[1].name, 'block2');
        assert.strictEqual(config.blocks[1].task, 5);
    });

    test('Config stores test data correctly', () => {
        const tests = [
            { time: 600, blocks: [{ block: 'block1', task: 2 }] },
            { time: 300, blocks: [{ block: 'block2 block3', task: 3 }] }
        ];
        const config = new Config([], tests);
        
        assert.strictEqual(config.tests.length, 2);
        assert.strictEqual(config.tests[0].time, 600);
        assert.strictEqual(config.tests[0].blocks[0].block, 'block1');
        assert.strictEqual(config.tests[1].blocks[0].block, 'block2 block3');
    });

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
        ];
        
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
        ];
        
        provider.setActiveTest(testTasks, 600);
        assert.strictEqual(provider.getChildren().length, 1);
        
        provider.clearActiveTest();
        assert.strictEqual(provider.getChildren().length, 0);
    });
});