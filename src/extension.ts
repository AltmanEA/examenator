import * as vscode from 'vscode';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ActiveTestProvider, openTaskAndTestCommand, runTestCommand } from './activeTestProvider';
import { readConfig, clearConfigCache, Block } from './config';
import { TasksProvider } from './taskProvider';
import { TestsProvider } from './testProvider';
import { collectTasksFromBlock } from './taskSelector';

const execFileAsync = promisify(execFile);

// Контекстная переменная для показа кнопки сброса только в git-репозитории
const IS_GIT_REPO_CONTEXT = 'examView:isGitRepo';

// Выполняет git-команду в указанной папке
async function runGit(cwd: string, args: string[]): Promise<string> {
    const result = await execFileAsync('git', args, { cwd });
    return result.stdout.trim();
}

// Проверяет, является ли папка рабочей области частью git-репозитория
async function isGitRepo(cwd: string): Promise<boolean> {
    try {
        return (await runGit(cwd, ['rev-parse', '--is-inside-work-tree'])) === 'true';
    }
    catch {
        return false;
    }
}

// Обновляет контекст, управляющий видимостью кнопки сброса
async function updateGitRepoContext(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    const value = folder ? await isGitRepo(folder.uri.fsPath) : false;
    await vscode.commands.executeCommand('setContext', IS_GIT_REPO_CONTEXT, value);
}

// Команда «Сбросить всё»: откат unstaged изменений, удаление untracked файлов,
// закрытие всех редакторов и терминалов. Staged изменения сохраняются.
function resetWorkspaceCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('examView.resetWorkspace', async () => {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            vscode.window.showErrorMessage('Рабочая область не открыта');
            return;
        }

        const cwd = folder.uri.fsPath;
        const errors: string[] = [];

        try {
            // Восстановление рабочей директории по индексу: unstaged изменения откатываются, staged остаются
            await runGit(cwd, ['restore', '.']);
        }
        catch {
            errors.push('не удалось откатить изменения');
        }

        try {
            // Удаление неотслеживаемых файлов и каталогов
            await runGit(cwd, ['clean', '-fd']);
        }
        catch {
            errors.push('не удалось удалить неотслеживаемые файлы');
        }

        // Закрытие всех открытых редакторов
        try {
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        }
        catch {
            errors.push('не удалось закрыть редакторы');
        }

        // Закрытие всех терминалов
        for (const terminal of vscode.window.terminals) {
            terminal.dispose();
        }

        if (errors.length > 0) {
            vscode.window.showWarningMessage(`Сброс выполнен частично: ${errors.join(', ')}`);
            return;
        }

        vscode.window.showInformationMessage('Рабочая область сброшена');
    });
}

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
        resetWorkspaceCommand(),
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

    // Обновляем контекст видимости кнопки сброса
    void updateGitRepoContext();
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            await updateGitRepoContext();
        })
    );

    context.subscriptions.push(
        tasksView,
        testsView,
        selectedTasksView,
        ...commands
    );
}



export function deactivate() { }