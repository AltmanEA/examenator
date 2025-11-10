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
    private isBlinking: boolean = false;

    setActiveTest(tasks: SelectedTask[], testTime: number): void {
        this.tasks = tasks;
        this.totalTime = testTime;
        this.timeLeft = testTime;
        this.startTimer();
        this._onDidChangeTreeData.fire(undefined);
    }

    clearActiveTest(): void {
        this.tasks = [];
        this.stopTimer();
        this._onDidChangeTreeData.fire(undefined);
    }

    private startTimer(): void {
        this.stopTimer();
        this.timer = setInterval(() => {
            this.timeLeft--;
            this._onDidChangeTreeData.fire(undefined);
            
            if (this.timeLeft <= 0) {
                this.stopTimer();
            }
        }, 1000);
    }

    private stopTimer(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): vscode.TreeItem[] {
        const items: vscode.TreeItem[] = [];
        
        // Добавляем таймер как первый элемент
        const timerItem = new vscode.TreeItem(this.getTimerText(), vscode.TreeItemCollapsibleState.None);
        timerItem.id = 'timer';
        timerItem.iconPath = this.getTimerIcon();
        items.push(timerItem);
        
        // Добавляем задачи
        items.push(...this.tasks.map(task => 
            new TaskTreeItem(
                task.name, 
                task.block, 
                task.task,
                task.template,
                task.testTemplate
            )
        ));
        
        return items;
    }

    private getTimerText(): string {
        if (this.timeLeft <= 0) {
            return 'Время вышло!';
        }
        
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        return `Осталось: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    private getTimerIcon(): vscode.ThemeIcon {
        if (this.timeLeft <= 0) {
            return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
        }
        
        const timePercent = (this.timeLeft / this.totalTime) * 100;
        if (timePercent <= 10) {
            // Мигающий желтый
            this.isBlinking = !this.isBlinking;
            return new vscode.ThemeIcon(this.isBlinking ? 'watch' : 'warning', 
                                      new vscode.ThemeColor('warningForeground'));
        }
        
        // Зеленый
        return new vscode.ThemeIcon('watch', new vscode.ThemeColor('terminal.ansiGreen'));
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
        if (!workspaceFolder) return;

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
        const terminal = vscode.window.createTerminal(`Тест: ${taskItem.name}`);
        terminal.show();

        // Имя теста без расширения для npm run test
        const testName = testFileName.replace('.ts', '').replace('.js', '');
        terminal.sendText(`npm run test ${testName}`);
    });
}

export function runTestCommand(activeTestProvider: ActiveTestProvider) {
    return vscode.commands.registerCommand('examView.runTest', async (testItem: any) => {

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