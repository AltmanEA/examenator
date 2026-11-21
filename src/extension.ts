import * as vscode from 'vscode';
import { ActiveTestProvider, openTaskAndTestCommand, runTestCommand } from './activeTestProvider';
import { readConfig, clearConfigCache, Block } from './config';
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
        
        // При любом изменении config.json сбрасываем кэш и обновляем деревья
        const refreshAll = () => {
            clearConfigCache();
            tasksProvider.refresh();
            testsProvider.refresh();
        };

        watcher.onDidChange(refreshAll);
        watcher.onDidCreate(refreshAll);
        watcher.onDidDelete(refreshAll);

        context.subscriptions.push(watcher);
    }

    const commands = [
        openTaskAndTestCommand(),
        runTestCommand(activeTestProvider),
        vscode.commands.registerCommand('examView.selectBlock', async (blockName: string) => {
            let config;
            try {
                config = await readConfig();
            } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Не удалось выбрать блок: ${reason}`);
                return;
            }
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