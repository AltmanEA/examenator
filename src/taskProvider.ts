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
                new BlockTreeItem(block.name, block.task)
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
        public readonly task: number
    ) {
        super(`${name} (задач: ${task})`, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Block: ${name}, Task: ${task}`;
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
        const newBlock = { name, task: 0 };
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

        block.task++;
        const taskNum = block.task;

        if (taskNum > 100) {
            vscode.window.showErrorMessage('Достигнут лимит задач (100)');
            block.task--;
            return;
        }

        // Шаблоны по умолчанию
        const taskTemplate = block.template || '{block}{task}.ts';
        const testTemplate = block.testTemplate || '{block}{task}.test.ts';

        // Генерируем имена файлов
        const taskFileName = taskTemplate
            .replace('{block}', block.name)
            .replace('{task}', taskNum.toString().padStart(2, '0'));

        const testFileName = testTemplate
            .replace('{block}', block.name)
            .replace('{task}', taskNum.toString().padStart(2, '0'))

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