import * as vscode from 'vscode';
import { ActiveTestProvider, openTaskAndTestCommand, runTestCommand } from './activeTestProvider';
import { Config, writeConfig } from './config';
import { TasksProvider } from './taskProvider';
import { TestsProvider } from './testProvider';

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



export function deactivate() { }