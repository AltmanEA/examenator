import * as vscode from 'vscode';
import { ActiveTestProvider, openTaskAndTestCommand, runTestCommand } from './activeTestProvider';
import { Config, writeConfig } from './config';
import { addBlockCommand, addTaskCommand, TasksProvider } from './taskProvider';
import { addTestCommand, TestsProvider } from './testProvider';

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
    const activeTestView = vscode.window.createTreeView('activeTestView', {
        treeDataProvider: activeTestProvider
    });

    const commands = [
        createConfigCommand(tasksProvider, testsProvider),
        addBlockCommand(tasksProvider),
        addTaskCommand(tasksProvider),
        addTestCommand(testsProvider),
        runTestCommand(activeTestProvider),
        openTaskAndTestCommand()
    ];

    context.subscriptions.push(
        tasksView,
        testsView,
        activeTestView,
        ...commands
    );
}

function createConfigCommand(tasksProvider: TasksProvider, testsProvider: TestsProvider) {
    return vscode.commands.registerCommand('examView.createConfig', async () => {
        const config = new Config();
        await writeConfig(config);
        tasksProvider.refresh();
        testsProvider.refresh();
        vscode.window.showInformationMessage('Конфигурация создана');
    });
}


export function deactivate() { }