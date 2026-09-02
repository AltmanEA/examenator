import * as vscode from 'vscode';
import { readConfig, Block } from './config';

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
                vscode.window.showInformationMessage('Конфигурация не найдена');
                return [];
            }

            return config.blocks.map(block => {
                // Определяем количество задач в зависимости от формата
                let taskCount = 0;
                if (block.tasks) {
                    // Ручная нумерация: количество задач равно длине массива
                    taskCount = block.tasks.length;
                } else if (block.task) {
                    // Автоматическая нумерация: количество задач задано числом
                    taskCount = block.task;
                }
                return new BlockTreeItem(block, taskCount);
            });
        } catch {
            vscode.window.showInformationMessage('Конфигурация не найдена');
            return [];
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
}

class BlockTreeItem extends vscode.TreeItem {
    constructor(
        public readonly block: Block,
        public readonly taskCount: number
    ) {
        const displayName = block.title || block.name;
        super(`${displayName} (задач: ${taskCount})`, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Блок: ${block.name}, Количество задач: ${taskCount}`;
        this.contextValue = 'block';
        
        this.command = {
            command: 'examView.selectBlock',
            title: 'Выбрать блок',
            arguments: [block.name]
        };
    }
}




