import * as vscode from 'vscode';
import { readConfig } from './config';

export type SelectedTask = {
    block: string;
    task: number;
    name: string;
    template?: string;
    testTemplate?: string;
};

export class ActiveTestProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private tasks: SelectedTask[] = [];
    private timer: NodeJS.Timeout | null = null;
    private timeLeft: number = 0;
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
        this.timeLeft = testTime;
        this.warningTime = Math.floor(testTime * 0.3); // 30% от времени
        this.alertTime = Math.floor(testTime * 0.1);   // 10% от времени

        this.statusBarItem.show();
        this.startTimer();
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
        this.updateStatusBar();

        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateStatusBar();

            if (this.timeLeft <= 0) {
                this.stopTimer();
                vscode.window.showWarningMessage('Время вышло!');
            }
        }, 1000);
    }

    private stopTimer(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private updateStatusBar(): void {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (this.timeLeft <= 0) {
            this.statusBarItem.text = `$(error) Время вышло!`;
            this.statusBarItem.color = new vscode.ThemeColor('errorForeground');
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (this.timeLeft <= this.alertTime) {
            this.statusBarItem.text = `$(warning) ${timeString}`;
            this.statusBarItem.color = new vscode.ThemeColor('errorForeground');
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (this.timeLeft <= this.warningTime) {
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
                task.task,
                task.template,
                task.testTemplate
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
        public readonly taskNum: number,
        public readonly template?: string,
        public readonly testTemplate?: string
    ) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Блок: ${block}, Задача: ${taskNum}`;
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
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) { return; }

        // Генерируем имена файлов по шаблонам
        const taskTemplate = taskItem.template || '{block}{task}.ts';
        const testTemplate = taskItem.testTemplate || '{block}{task}.test.ts';

        const taskFileName = taskTemplate
            .replace('{block}', taskItem.block)
            .replace('{task}', taskItem.taskNum.toString().padStart(2, '0'));

        const testFileName = testTemplate
            .replace('{block}', taskItem.block)
            .replace('{task}', taskItem.taskNum.toString().padStart(2, '0'));

        // Открываем файл задачи в новой панели 
        const taskFileUri = vscode.Uri.joinPath(workspaceFolder.uri, 'src', taskItem.block, taskFileName);
        const taskDocument = await vscode.workspace.openTextDocument(taskFileUri);
        await vscode.window.showTextDocument(taskDocument, { viewColumn: vscode.ViewColumn.One, preview: false });

        // Открываем файл теста в новой панели 
        const testFileUri = vscode.Uri.joinPath(workspaceFolder.uri, 'src', taskItem.block, testFileName);
        const testDocument = await vscode.workspace.openTextDocument(testFileUri);
        await vscode.window.showTextDocument(testDocument, { viewColumn: vscode.ViewColumn.Two, preview: false });

        // Создаем новый терминал для каждой задачи
        const terminalName = `Тест: ${taskItem.name}`;
        let terminal = vscode.window.terminals.find(
            t => t.name === terminalName);
        if (!terminal) {
            terminal = vscode.window.createTerminal(terminalName);
            // Имя теста без расширения для npm run test
            const testName = testFileName.replace('.ts', '').replace('.js', '');
            terminal.sendText(`npm run test ${testName}`);
        }
        terminal.show();

    });
}

export function runTestCommand(activeTestProvider: ActiveTestProvider) {
    return vscode.commands.registerCommand('examView.runTest', async (testItem: any) => {
        // Сбрасываем репозиторий к последнему коммиту перед запуском теста
        try {
            await resetRepositoryToHead();
        } catch (error) {
            vscode.window.showErrorMessage(`Ошибка при сбросе репозитория: ${error}`);
        }

        // Остальная логика без изменений
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
                const block = config.blocks.find(b => b.name === blockName);
                if (block && block.task > 0) {
                    for (let taskNum = 1; taskNum <= block.task; taskNum++) {
                        allAvailableTasks.push({
                            block: blockName,
                            task: taskNum,
                            name: `${blockName}${taskNum.toString().padStart(2, '0')}`,
                            template: block.template,
                            testTemplate: block.testTemplate
                        });
                    }
                }
            }

            const shuffled = [...allAvailableTasks].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, Math.min(totalTasksNeeded, shuffled.length));
            selectedTasks.push(...selected);
        }

        activeTestProvider.setActiveTest(selectedTasks, test.time);
    });
}

// Вынесем логику сброса в отдельную функцию
async function resetRepositoryToHead(): Promise<void> {
    const terminal = vscode.window.createTerminal('Git Reset');
    terminal.show();
    
    // Выполняем команду сброса
    terminal.sendText('git reset --hard HEAD');
    terminal.sendText('echo "Репозиторий сброшен к последнему коммиту"');
    
    // Ждем немного для выполнения команды
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Закрываем терминал
    terminal.dispose();
    
    vscode.window.showInformationMessage('Репозиторий сброшен к последнему коммиту');
}