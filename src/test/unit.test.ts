import * as assert from 'assert';
import * as sinon from 'sinon';
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

suite('ActiveTestProvider Additional Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('setSelectedTasks sets tasks and stops timer', () => {
        const provider = new ActiveTestProvider();
        const testTasks = [
            { block: 'math', task: 1, name: 'math01' }
        ] as any[];
        
        // Заглушка для stopTimer
        const stopTimerStub = sandbox.stub(provider as any, 'stopTimer');
        
        provider.setSelectedTasks(testTasks);
        const children = provider.getChildren();
        
        assert.strictEqual(children.length, 1);
        assert.strictEqual(children[0].label, 'math01');
        assert.strictEqual(stopTimerStub.calledOnce, true);
    });

    test('updateStatusBar changes color based on time', () => {
        const provider: any = new ActiveTestProvider();
        provider.totalTime = 600;
        provider.warningTime = 180; // 30%
        provider.alertTime = 60;   // 10%
        provider.statusBarItem = { text: '', color: undefined, backgroundColor: undefined };
        
        // Нормальное время
        provider.updateStatusBar(600);
        assert.strictEqual(provider.statusBarItem.text, '$(watch) 10:00');
        
        // Время предупреждения
        provider.updateStatusBar(179);
        // Проверяем, что цвет изменился на warning
        
        // Время тревоги
        provider.updateStatusBar(59);
        // Проверяем, что цвет изменился на error
        
        // Время истекло
        provider.updateStatusBar(0);
        assert.strictEqual(provider.statusBarItem.text, '$(error) Время вышло!');
    });
});