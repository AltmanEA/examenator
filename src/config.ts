import * as vscode from 'vscode';

export type Block = {
  name: string;
  title?: string; // Отображаемое название блока (если отсутствует, использовать name)
  tasks?: string[]; // Массив имен задач для ручной нумерации
  task?: number; // Количество задач для автоматической нумерации
  template?: string;
  testTemplate?: string;
  testCommand?: string; // Команда для запуска тестов для блока (по умолчанию npm run test)
  // Новый формат для задания трех файлов
  templates?: {
    source?: string;
    task?: string;
    test?: string;
  };
};
export type Tests = {
  time: number;
  title?: string; // Отображаемое название теста (если отсутствует, использовать "Тест N")
  blocks: {
    block: string;
    task: number;
  }[];
};


export type SelectedTask = {
    block: string;
    taskId: string; // Идентификатор задачи вместо номера
    name: string;
    template?: string;
    testTemplate?: string;
    // Новый формат для задания трех файлов
    templates?: {
        source?: string;
        task?: string;
        test?: string;
    };
};

export type Config = {
  blocks: Block[];
  tests: Tests[];
  path: string;
};

const CONFIG_FILE = 'config.json';

export async function readConfig(): Promise<Config> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return createDefaultConfig();
    }

    const configUri = vscode.Uri.joinPath(workspaceFolder.uri, CONFIG_FILE);

    try {
        const data = await vscode.workspace.fs.readFile(configUri);
        let json: { blocks?: Block[]; tests?: Tests[]; path?: string };
        try {
            json = JSON.parse(new TextDecoder('utf-8').decode(data));
        } catch (parseError) {
            vscode.window.showErrorMessage(
                'Ошибка при разборе config.json: невалидный JSON. Проверьте синтаксис файла в корне рабочей области.'
            );
            return createDefaultConfig();
        }
        return { blocks: json.blocks || [], tests: json.tests || [], path: json.path || 'src' };
    } catch {
        return createDefaultConfig();
    }
}

export async function writeConfig(config: Config): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace opened');
    }

    const configUri = vscode.Uri.joinPath(workspaceFolder.uri, CONFIG_FILE);
    const content = new TextEncoder().encode(JSON.stringify(config, null, 2));
    await vscode.workspace.fs.writeFile(configUri, content);
}

export function createDefaultConfig(): Config {
    return { blocks: [], tests: [], path: 'src' };
}
