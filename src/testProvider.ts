import * as vscode from 'vscode';
import { readConfig, Tests, writeConfig } from './config';

export class TestsProvider implements vscode.TreeDataProvider<TestTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TestTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    getTreeItem(element: TestTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<TestTreeItem[]> {
        try {
            const config = await readConfig();
            return config.tests.map((test, index) =>
                new TestTreeItem(test.time, index, test.blocks)
            );
        } catch {
            return [];
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
}

class TestTreeItem extends vscode.TreeItem {
    constructor(
        public readonly time: number,
        public readonly index: number,
        public readonly blocks: Tests['blocks']
    ) {
        super(`Тест ${index + 1} (${time} сек)`, vscode.TreeItemCollapsibleState.None);
        this.tooltip = this.getTooltip();
        this.contextValue = 'test';
        this.iconPath = new vscode.ThemeIcon('watch');

        this.command = {
            command: 'examView.selectTest',
            title: 'Выбрать тест',
            arguments: [this]
        };
    }

    private getTooltip(): string {
        const blocksInfo = this.blocks.map(block =>
            `${block.block}: ${block.task} задач`
        ).join('\n');
        return `Тест продолжительностью ${this.time} секунд\nБлоки:\n${blocksInfo}`;
    }
}



