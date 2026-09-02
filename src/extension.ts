import * as vscode from 'vscode';
import { ActiveTestProvider, openTaskAndTestCommand, runTestCommand } from './activeTestProvider';
import { readConfig, Block } from './config';
import { TasksProvider } from './taskProvider';
import { TestsProvider } from './testProvider';
import { collectTasksFromBlock } from './taskSelector';

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

    // FileSystemWatcher для автообновления view при изменении config.json
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
        const configPath = vscode.Uri.joinPath(workspaceFolder.uri, 'config.json');
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(workspaceFolder, 'config.json')
        );
        
        watcher.onDidChange(() => {
            tasksProvider.refresh();
            testsProvider.refresh();
        });

        watcher.onDidCreate(() => {
            tasksProvider.refresh();
            testsProvider.refresh();
        });

        watcher.onDidDelete(() => {
            tasksProvider.refresh();
            testsProvider.refresh();
        });

        context.subscriptions.push(watcher);
    }

    const commands = [
        openTaskAndTestCommand(),
        runTestCommand(activeTestProvider),
        vscode.commands.registerCommand('examView.selectBlock', async (blockName: string) => {
            const config = await readConfig();
            const configBlock = config.blocks.find((b: Block) => b.name === blockName);
            if (!configBlock) {
                vscode.window.showErrorMessage('Блок не найден в конфигурации');
                return;
            }

            const selectedTasks = collectTasksFromBlock(configBlock);
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