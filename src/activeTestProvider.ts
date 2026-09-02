import * as vscode from 'vscode';
import { readConfig, SelectedTask } from './config';
import { collectTasksFromBlock, shuffle } from './taskSelector';

// Проверяем, работает ли расширение в веб-версии (vscode.dev / github.dev)
function isWeb(): boolean {
    return vscode.env.uiKind === vscode.UIKind.Web;
}

// Сброс репозитория к последнему коммиту через терминал (только десктоп)
async function resetRepositoryToHead(): Promise<void> {
    if (isWeb()) {
        vscode.window.showWarningMessage('Сброс репозитория недоступен в веб-версии');
        return;
    }
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
}

export class ActiveTestProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private tasks: SelectedTask[] = [];
    private timer: ReturnType<typeof setInterval> | null = null;
    private endTime: number = 0; // Timestamp окончания теста (мс)
    private totalTime: number = 0;
    private statusBarItem: vscode.StatusBarItem;
    private warningTime: number = 0;
    private alertTime: number = 0;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    }

    setActiveTest(tasks: SelectedTask[], testTime: number): void {
        this.tasks = tasks;
        this.totalTime = testTime;
        this.endTime = Date.now() + testTime * 1000;
        this.warningTime = Math.floor(testTime * 0.3); // 30% от времени
        this.alertTime = Math.floor(testTime * 0.1);   // 10% от времени

        this.statusBarItem.show();
        this.startTimer();
        this._onDidChangeTreeData.fire(undefined);
    }
    
    setSelectedTasks(tasks: SelectedTask[]): void {
        this.tasks = tasks;
        this.stopTimer();
        this.statusBarItem.hide();
        this._onDidChangeTreeData.fire(undefined);
    }

    clearActiveTest(): void {
        this.tasks = [];
        this.stopTimer();
        this.statusBarItem.hide();
        this._onDidChangeTreeData.fire(undefined);
    }

    private startTimer(): void {
        this.stopTimer();
        const timeLeft = Math.max(0, Math.floor((this.endTime - Date.now()) / 1000));
        this.updateStatusBar(timeLeft);

        this.timer = setInterval(() => {
            const remainingMs = this.endTime - Date.now();
            const timeLeft = Math.max(0, Math.floor(remainingMs / 1000));

            this.updateStatusBar(timeLeft);

            if (timeLeft <= 0) {
                this.stopTimer();
                vscode.window.showWarningMessage('Время вышло!');
            }
        }, 250);
    }

    private stopTimer(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private updateStatusBar(timeLeft: number): void {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (timeLeft <= 0) {
            this.statusBarItem.text = `$(error) Время вышло!`;
            this.statusBarItem.color = new vscode.ThemeColor('errorForeground');
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (timeLeft <= this.alertTime) {
            this.statusBarItem.text = `$(warning) ${timeString}`;
            this.statusBarItem.color = new vscode.ThemeColor('errorForeground');
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (timeLeft <= this.warningTime) {
            this.statusBarItem.text = `$(watch) ${timeString}`;
            this.statusBarItem.color = new vscode.ThemeColor('warningForeground');
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.text = `$(watch) ${timeString}`;
            this.statusBarItem.color = new vscode.ThemeColor('terminal.ansiGreen');
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): vscode.TreeItem[] {
        // Возвращаем только задачи, без таймера в TreeView
        return this.tasks.map(task =>
            new TaskTreeItem(
                task.name,
                task.block,
                task.taskId,
                task.template,
                task.testTemplate,
                task.templates
            )
        );
    }

    dispose() {
        this.stopTimer();
        this.statusBarItem.dispose();
    }
}

class TaskTreeItem extends vscode.TreeItem {
    constructor(
        public readonly name: string,
        public readonly block: string,
        public readonly taskId: string, // Используем taskId вместо taskNum
        public readonly template?: string,
        public readonly testTemplate?: string,
        public readonly templates?: {
            source?: string;
            task?: string;
            test?: string;
        }
    ) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Блок: ${block}, Задача: ${taskId}`;
        this.iconPath = new vscode.ThemeIcon('file');
        this.contextValue = 'task';

        this.command = {
            command: 'examView.openTaskAndTest',
            title: 'Открыть задачу и тест',
            arguments: [this]
        };
    }
}

export function openTaskAndTestCommand() {
    return vscode.commands.registerCommand('examView.openTaskAndTest', async (taskItem: TaskTreeItem) => {
        // Закрываем все открытые редакторы перед открытием новых
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        // В веб-версии терминалы недоступны
        if (!isWeb()) {
            vscode.window.terminals.forEach(terminal => terminal.dispose());
        }
        
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) { return; }
        const config = await readConfig();

        // Функция для безопасного открытия файла
        async function tryOpenFile(
            fileName: string,
            viewColumn: vscode.ViewColumn,
            description: string,
            workspaceFolder: vscode.WorkspaceFolder,
            config: any,
            preserveFocus?: boolean
        ): Promise<boolean> {
            try {
                const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, config.path, taskItem.block, fileName);
                const document = await vscode.workspace.openTextDocument(fileUri);
                await vscode.window.showTextDocument(document, { viewColumn, preview: false, preserveFocus });
                return true;
            } catch (error) {
                vscode.window.showWarningMessage(`Файл ${description} не найден: ${fileName}. Продолжаем без него.`);
                return false;
            }
        }

        // Проверяем, используется ли новый формат
        const useNewFormat = !!taskItem.templates;
        let testFileName = ''; // Объявляем переменную заранее

        if (useNewFormat) {
            // Новый формат - открываем три файла, но в двух вкладках
            let sourceTemplate = '{task}.ts';
            let taskTemplate = '{task}.ts';
            let testTemplate = '{task}.test.ts';

            // Используем новый формат
            if (taskItem.templates) {
                sourceTemplate = taskItem.templates.source || sourceTemplate;
                taskTemplate = taskItem.templates.task || taskTemplate;
                testTemplate = taskItem.templates.test || testTemplate;
            }

            // Генерируем имена файлов по шаблонам
            const sourceFileName = sourceTemplate
                .replace('{block}', taskItem.block)
                .replace(/{task}/g, taskItem.taskId);

            const taskFileName = taskTemplate
                .replace('{block}', taskItem.block)
                .replace(/{task}/g, taskItem.taskId);

            testFileName = testTemplate
                .replace('{block}', taskItem.block)
                .replace(/{task}/g, taskItem.taskId);

            // Открываем исходный код в первой вкладке
            await tryOpenFile(sourceFileName, vscode.ViewColumn.One, 'исходного кода', workspaceFolder, config);
            // Открываем тест во второй вкладке, но без переключения фокуса
            await tryOpenFile(testFileName, vscode.ViewColumn.Two, 'теста', workspaceFolder, config, true);
            // Открываем текст задачи также во второй вкладке (активный)
            await tryOpenFile(taskFileName, vscode.ViewColumn.Two, 'условия задачи', workspaceFolder, config);
        } else {
            // Старый формат - открываем два файла
            let taskTemplate = '{task}.ts';
            let testTemplate = '{task}.test.ts';

            // Используем старый формат как fallback
            if (taskItem.template) {
                taskTemplate = taskItem.template;
            }
            if (taskItem.testTemplate) {
                testTemplate = taskItem.testTemplate;
            }

            // Генерируем имена файлов по шаблонам
            const taskFileName = taskTemplate
                .replace('{block}', taskItem.block)
                .replace(/{task}/g, taskItem.taskId);

            testFileName = testTemplate
                .replace('{block}', taskItem.block)
                .replace(/{task}/g, taskItem.taskId);

            // Пытаемся открыть каждый файл, продолжаем при ошибке
            await tryOpenFile(taskFileName, vscode.ViewColumn.One, 'условия задачи', workspaceFolder, config);
            await tryOpenFile(testFileName, vscode.ViewColumn.Two, 'теста', workspaceFolder, config);
        }

        // Создаем терминал для запуска тестов (только десктоп-версия)
        if (isWeb()) {
            vscode.window.showWarningMessage('Запуск тестов в терминале недоступен в веб-версии');
            return;
        }

        // Создаем новый терминал для каждой задачи с уникальным именем, включающим имя блока
        const terminalName = `Тест: ${taskItem.name} (${taskItem.block})`;
        let terminal = vscode.window.terminals.find(
            t => t.name === terminalName);
        if (!terminal) {
            terminal = vscode.window.createTerminal(terminalName);
            // Имя теста без расширения для npm run test
            const testName = testFileName.replace(/\.tsx$|\.ts$|\.js$/, '');
            
            // Получаем команду для запуска тестов из конфигурации блока или используем по умолчанию
            const block = config.blocks.find(b => b.name === taskItem.block);
            const testCommand = block?.testCommand || 'npm run test';
            
            terminal.sendText(`${testCommand} ${testName}`);
        }
        terminal.show();

    });
}

export function runTestCommand(activeTestProvider: ActiveTestProvider) {
    return vscode.commands.registerCommand('examView.runTest', async (testItem: any) => {
        // Сбрасываем репозиторий к последнему коммиту перед запуском теста
        await resetRepositoryToHead();

        // В веб-версии терминалы недоступны
        if (!isWeb()) {
            vscode.window.terminals.forEach(terminal => terminal.dispose());
        }

        await vscode.commands.executeCommand('workbench.action.closeAllEditors');

        const config = await readConfig();
        const test = config.tests[testItem.index];

        const selectedTasks: SelectedTask[] = [];

        for (const testBlock of test.blocks) {
            const blockNames = testBlock.block.split(' ');
            const totalTasksNeeded = testBlock.task;

            const allAvailableTasks: SelectedTask[] = [];

            for (const blockName of blockNames) {
                const block = config.blocks.find(b => b.name === blockName);
                if (block) {
                    allAvailableTasks.push(...collectTasksFromBlock(block));
                }
            }

            const selected = shuffle(allAvailableTasks).slice(0, Math.min(totalTasksNeeded, allAvailableTasks.length));
            selectedTasks.push(...selected);
        }

        activeTestProvider.setActiveTest(selectedTasks, test.time);
    });
}