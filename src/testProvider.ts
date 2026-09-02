import * as vscode from 'vscode';
import { readConfig, Tests } from './config';

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
                new TestTreeItem(test, index)
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
        public readonly test: Tests,
        public readonly index: number
    ) {
        const displayTitle = test.title || `Тест ${index + 1}`;
        super(`${displayTitle} (${test.time} сек)`, vscode.TreeItemCollapsibleState.None);
        this.tooltip = this.getTooltip();
        this.contextValue = 'test';
        this.iconPath = new vscode.ThemeIcon('watch');

        this.command = {
            command: 'examView.runTest',
            title: 'Выбрать тест',
            arguments: [index]
        };
    }

    private getTooltip(): string {
        const blocksInfo = this.test.blocks.map(block =>
            `${block.block}: ${block.task} задач`
        ).join('\n');
        return `Тест продолжительностью ${this.test.time} секунд\nБлоки:\n${blocksInfo}`;
    }
}



