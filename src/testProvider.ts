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
            command: 'examView.runTest',
            title: 'Запустить тест',
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

export function addTestCommand(testsProvider: TestsProvider) {
    return vscode.commands.registerCommand('examView.addTest', async (blockItem: any) => {
        const time = await vscode.window.showInputBox({
            prompt: 'Введите время на тест (в секундах)',
            validateInput: (value) => {
                const num = parseInt(value);
                return num > 0 ? null : 'Введите положительное число';
            }
        });

        if (!time) { return; }

        const config = await readConfig();
        const newTest = {
            time: parseInt(time),
            blocks: []
        };

        config.tests.push(newTest);
        await writeConfig(config);
        testsProvider.refresh();
        vscode.window.showInformationMessage(`Тест добавлен с временем ${time} секунд`);
    });
}


