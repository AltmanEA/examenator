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

// Кэш последнего успешно прочитанной конфигурации.
// Используется как fallback при временных ошибках чтения файла
// (например, сетевая задержка ФС в SSH-контейнере).
let configCache: Config | null = null;

// Сбрасывает кэш (вызывается из FileSystemWatcher при изменении config.json)
export function clearConfigCache(): void {
    configCache = null;
}

export async function readConfig(folder?: vscode.WorkspaceFolder): Promise<Config> {
    const workspaceFolder = folder ?? vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('Не открыта рабочая папка: невозможно прочитать config.json');
    }

    const configUri = vscode.Uri.joinPath(workspaceFolder.uri, CONFIG_FILE);

    let data: Uint8Array;
    try {
        data = await vscode.workspace.fs.readFile(configUri);
    } catch (error) {
        // Временная ошибка чтения (файл недоступен, сетевой сбой) —
        // используем кэш, если он есть; иначе пробрасываем реальную причину
        if (configCache) {
            return configCache;
        }
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Не удалось прочитать config.json (${configUri.fsPath}): ${reason}`);
    }

    let json: { blocks?: Block[]; tests?: Tests[]; path?: string };
    try {
        json = JSON.parse(new TextDecoder('utf-8').decode(data));
    } catch (parseError) {
        // Невалидный JSON — ошибка конфигурации, кэш не применяем
        const reason = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(
            `Ошибка при разборе config.json: невалидный JSON (${configUri.fsPath}): ${reason}`
        );
    }

    const config: Config = {
        blocks: json.blocks || [],
        tests: json.tests || [],
        path: json.path || 'src'
    };
    configCache = config;
    return config;
}

// Старое поведение: при любой ошибке возвращает пустую конфигурацию по умолчанию
export async function readConfigOrDefault(): Promise<Config> {
    try {
        return await readConfig();
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
