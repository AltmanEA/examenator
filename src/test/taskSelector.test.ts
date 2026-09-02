import * as assert from 'assert';
import { collectTasksFromBlock, shuffle } from '../taskSelector';

suite('TaskSelector Tests', () => {

    suite('collectTasksFromBlock', () => {

        test('ручная нумерация: tasks: string[]', () => {
            const block = {
                name: 'math',
                tasks: ['task1', 'task2', 'task3'],
            };

            const result = collectTasksFromBlock(block);

            assert.strictEqual(result.length, 3);
            assert.deepStrictEqual(result[0], {
                block: 'math',
                taskId: 'task1',
                name: 'task1',
                template: undefined,
                testTemplate: undefined,
                templates: undefined,
            });
            assert.deepStrictEqual(result[1].taskId, 'task2');
            assert.deepStrictEqual(result[2].taskId, 'task3');
        });

        test('автоматическая нумерация: task: number', () => {
            const block = {
                name: 'alg',
                task: 5,
            };

            const result = collectTasksFromBlock(block);

            assert.strictEqual(result.length, 5);
            assert.strictEqual(result[0].taskId, 'alg01');
            assert.strictEqual(result[1].taskId, 'alg02');
            assert.strictEqual(result[2].taskId, 'alg03');
            assert.strictEqual(result[3].taskId, 'alg04');
            assert.strictEqual(result[4].taskId, 'alg05');
        });

        test('автоматическая нумерация: более 10 задач', () => {
            const block = {
                name: 'phys',
                task: 12,
            };

            const result = collectTasksFromBlock(block);

            assert.strictEqual(result.length, 12);
            assert.strictEqual(result[0].taskId, 'phys01');
            assert.strictEqual(result[8].taskId, 'phys09');
            assert.strictEqual(result[9].taskId, 'phys10');
            assert.strictEqual(result[11].taskId, 'phys12');
        });

        test('передача template и templates', () => {
            const block = {
                name: 'test',
                task: 2,
                template: '{task}.ts',
                testTemplate: '{task}.test.ts',
                templates: {
                    source: '{block}_src.ts',
                    task: '{block}_task.ts',
                    test: '{block}_test.ts',
                },
            };

            const result = collectTasksFromBlock(block);

            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].template, '{task}.ts');
            assert.strictEqual(result[0].testTemplate, '{task}.test.ts');
            assert.deepStrictEqual(result[0].templates, {
                source: '{block}_src.ts',
                task: '{block}_task.ts',
                test: '{block}_test.ts',
            });
        });

        test('пустой блок без tasks и task', () => {
            const block = { name: 'empty' };

            const result = collectTasksFromBlock(block);

            assert.strictEqual(result.length, 0);
        });

        test('task: 0 возвращает пустой массив', () => {
            const block = { name: 'zero', task: 0 };

            const result = collectTasksFromBlock(block);

            assert.strictEqual(result.length, 0);
        });

        test(' приоритет: tasks > task', () => {
            const block = {
                name: 'both',
                tasks: ['a', 'b'],
                task: 99,
            };

            const result = collectTasksFromBlock(block);

            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].taskId, 'a');
            assert.strictEqual(result[1].taskId, 'b');
        });
    });

    suite('shuffle', () => {

        test('возвращает массив той же длины', () => {
            const arr = [1, 2, 3, 4, 5];
            const result = shuffle(arr);
            assert.strictEqual(result.length, arr.length);
        });

        test('не мутирует исходный массив', () => {
            const arr = [1, 2, 3, 4, 5];
            const original = [...arr];
            shuffle(arr);
            assert.deepStrictEqual(arr, original);
        });

        test('содержит те же элементы (перемешанные)', () => {
            const arr = [1, 2, 3, 4, 5];
            const result = shuffle(arr);
            assert.deepStrictEqual(result.sort((a, b) => a - b), [1, 2, 3, 4, 5]);
        });

        test('пустой массив', () => {
            const result = shuffle([]);
            assert.deepStrictEqual(result, []);
        });

        test('массив из одного элемента', () => {
            const result = shuffle([42]);
            assert.deepStrictEqual(result, [42]);
        });

        test('возвращает новый массив (не тот же референс)', () => {
            const arr = [1, 2, 3];
            const result = shuffle(arr);
            assert.notStrictEqual(result, arr);
        });
    });
});
