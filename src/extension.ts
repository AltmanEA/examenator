import * as vscode from 'vscode';
import { ActiveTestProvider, openTaskAndTestCommand } from './activeTestProvider';
import { Config, writeConfig, readConfig } from './config';
import { TasksProvider } from './taskProvider';
import { TestsProvider } from './testProvider';
import { SelectedTask } from './activeTestProvider';

export function activate(context: vscode.ExtensionContext) {
    const tasksProvider = new TasksProvider();
    const testsProvider = new TestsProvider();
    const activeTestProvider = new ActiveTestProvider();

    const tasksView = vscode.window.createTreeView('tasksView', {
        treeDataProvider: tasksProvider
    });
    const testsView = vscode.window.createTreeView('testsView', {
        treeDataProvider: testsProvider
    });
    const selectedTasksView = vscode.window.createTreeView('selectedTasksView', {
        treeDataProvider: activeTestProvider
    });

    const commands = [
        openTaskAndTestCommand(),
        vscode.commands.registerCommand('examView.selectTest', async (testItem: any) => {
            // Сбрасываем репозиторий к последнему коммиту перед запуском теста
            try {
                const terminal = vscode.window.createTerminal('Git Reset');
                terminal.show();
                terminal.sendText('git reset --hard HEAD');
                terminal.sendText('echo "Репозиторий сброшен к последнему коммиту"');
                await new Promise(resolve => setTimeout(resolve, 2000));
                terminal.dispose();
                vscode.window.showInformationMessage('Репозиторий сброшен к последнему коммиту');
            } catch (error) {
                vscode.window.showErrorMessage(`Ошибка при сбросе репозитория: ${error}`);
            }

            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            vscode.window.terminals.forEach(terminal => terminal.dispose());

            const config = await readConfig();
            const test = config.tests[testItem.index];

            const selectedTasks: SelectedTask[] = [];

            for (const testBlock of test.blocks) {
                const blockNames = testBlock.block.split(' ');
                const totalTasksNeeded = testBlock.task;

                const allAvailableTasks: SelectedTask[] = [];

                for (const blockName of blockNames) {
                    const block = config.blocks.find((b: any) => b.name === blockName);
                    if (block) {
                        // Проверяем, какой формат используется
                        if (block.tasks && block.tasks.length > 0) {
                            // Ручная нумерация: используем массив имен задач
                            for (const taskName of block.tasks) {
                                allAvailableTasks.push({
                                    block: blockName,
                                    taskId: taskName,
                                    name: taskName,
                                    template: block.template,
                                    testTemplate: block.testTemplate,
                                    templates: block.templates
                                });
                            }
                        } else if (block.task !== undefined && block.task > 0) {
                            // Автоматическая нумерация: генерируем имена задач от 1 до block.task
                            for (let i = 1; i <= block.task; i++) {
                                const taskName = blockName+(i < 10 ? '0' + i : i.toString());
                                allAvailableTasks.push({
                                    block: blockName,
                                    taskId: taskName,
                                    name: taskName,
                                    template: block.template,
                                    testTemplate: block.testTemplate,
                                    templates: block.templates
                                });
                            }
                        }
                    }
                }

                const shuffled = [...allAvailableTasks].sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, Math.min(totalTasksNeeded, shuffled.length));
                selectedTasks.push(...selected);
            }

            activeTestProvider.setActiveTest(selectedTasks, test.time);
        }),
        vscode.commands.registerCommand('examView.selectBlock', async (blockItem: any) => {
            const config = await readConfig();
            const block = config.blocks.find((b: any) => `${b.name} (задач: ${b.tasks ? b.tasks.length : b.task})` === blockItem.label);
            
            if (!block) {
                vscode.window.showErrorMessage('Блок не найден');
                return;
            }

            const selectedTasks: SelectedTask[] = [];
            
            if (block.tasks && block.tasks.length > 0) {
                // Ручная нумерация: используем массив имен задач
                for (const taskName of block.tasks) {
                    selectedTasks.push({
                        block: block.name,
                        taskId: taskName,
                        name: taskName,
                        template: block.template,
                        testTemplate: block.testTemplate,
                        templates: block.templates
                    });
                }
            } else if (block.task !== undefined && block.task > 0) {
                // Автоматическая нумерация: генерируем имена задач от 1 до block.task
                for (let i = 1; i <= block.task; i++) {
                    const taskName = block.name+(i < 10 ? '0' + i : i.toString());
                    selectedTasks.push({
                        block: block.name,
                        taskId: taskName,
                        name: taskName,
                        template: block.template,
                        testTemplate: block.testTemplate,
                        templates: block.templates
                    });
                }
            }
            
            activeTestProvider.setSelectedTasks(selectedTasks);
        })
    ];

    context.subscriptions.push(
        tasksView,
        testsView,
        selectedTasksView,
        ...commands
    );
}



export function deactivate() { }