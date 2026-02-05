import * as vscode from 'vscode';
import { readConfig, writeConfig, Config } from './config';

export class TasksProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (element) {
            return [];
        }

        try {
            const config = await readConfig();

            if (config.blocks.length === 0) {
                return [new CreateConfigItem()];
            }

            return config.blocks.map(block =>
                new BlockTreeItem(block.name, block.tasks.length)
            );
        } catch {
            return [new CreateConfigItem()];
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
}

class BlockTreeItem extends vscode.TreeItem {
    constructor(
        public readonly name: string,
        public readonly taskCount: number
    ) {
        super(`${name} (задач: ${taskCount})`, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Block: ${name}, Task Count: ${taskCount}`;
        this.contextValue = 'block';

        this.command = {
            command: 'examView.addTask',
            title: 'Добавить задачу',
            arguments: [this]
        };
    }
}

class CreateConfigItem extends vscode.TreeItem {
    constructor() {
        super('Создать конфигурацию', vscode.TreeItemCollapsibleState.None);
        this.command = {
            command: 'examView.createConfig',
            title: 'Создать конфигурацию'
        };
    }
}



export function addBlockCommand(tasksProvider: TasksProvider) {
    return vscode.commands.registerCommand('examView.addBlock', async () => {
        const name = await vscode.window.showInputBox({
            prompt: 'Введите название блока',
            validateInput: (value) => value ? null : 'Название не может быть пустым'
        });

        if (!name) { return; }

        const config = await readConfig();
        const newBlock = { name, tasks: [] };
        config.blocks.push(newBlock);
        await writeConfig(config);

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const blockPath = vscode.Uri.joinPath(workspaceFolder.uri, 'src', name);
            await vscode.workspace.fs.createDirectory(blockPath);
        }

        tasksProvider.refresh();
    });
}

export function addTaskCommand(tasksProvider: TasksProvider) {
    return vscode.commands.registerCommand('examView.addTask', async (blockItem: any) => {
        const config = await readConfig();
        const block = config.blocks.find(b => b.name === blockItem.name);

        if (!block) { return; }

        // Запрашиваем имя задачи у пользователя
        const taskName = await vscode.window.showInputBox({
            prompt: 'Введите имя задачи (латинские буквы, цифры, подчеркивания)',
            validateInput: (value) => {
                if (!value) {
                    return 'Имя задачи не может быть пустым';
                }
                if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    return 'Имя задачи должно содержать только латинские буквы, цифры и подчеркивания';
                }
                // Проверяем, что задача с таким именем еще не существует в блоке
                if (block.tasks.some(t => t === value)) {
                    return 'Задача с таким именем уже существует в этом блоке';
                }
                return null;
            }
        });

        if (!taskName) { return; }

        // Добавляем задачу в блок
        block.tasks.push(taskName);

        // Генерируем номер задачи на основе индекса в массиве
        const taskIndex = block.tasks.length;

        if (taskIndex > 100) {
            vscode.window.showErrorMessage('Достигнут лимит задач (100)');
            block.tasks.pop(); // Удаляем последнюю добавленную задачу
            return;
        }

        // Шаблоны по умолчанию
        const taskTemplate = block.template || '{block}{task}.ts';
        const testTemplate = block.testTemplate || '{block}{task}.test.ts';

        // Генерируем имена файлов
        const taskFileName = taskTemplate
            .replace('{block}', block.name)
            .replace('{task}', taskName); // Используем имя задачи вместо номера

        const testFileName = testTemplate
            .replace('{block}', block.name)
            .replace('{task}', taskName); // Используем имя задачи вместо номера

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const taskFile = vscode.Uri.joinPath(workspaceFolder.uri, 'src', block.name, taskFileName);
            const testFile = vscode.Uri.joinPath(workspaceFolder.uri, 'src', block.name, testFileName);

            await vscode.workspace.fs.writeFile(taskFile, new Uint8Array());
            await vscode.workspace.fs.writeFile(testFile, new Uint8Array());

            const document1 = await vscode.workspace.openTextDocument(taskFile);
            const document2 = await vscode.workspace.openTextDocument(testFile);

            await vscode.window.showTextDocument(document1, { viewColumn: vscode.ViewColumn.One });
            await vscode.window.showTextDocument(document2, { viewColumn: vscode.ViewColumn.Two });
        }

        await writeConfig(config);
        tasksProvider.refresh();
    });
}