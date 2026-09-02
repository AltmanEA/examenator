import { Block, SelectedTask } from './config';

/**
 * Собрать все доступные задачи из блока.
 * Поддерживает оба формата: ручной (tasks: string[]) и автоматический (task: number).
 */
export function collectTasksFromBlock(block: Block): SelectedTask[] {
    const selectedTasks: SelectedTask[] = [];

    if (block.tasks && block.tasks.length > 0) {
        // Ручная нумерация: используем массив имён задач
        for (const taskName of block.tasks) {
            selectedTasks.push({
                block: block.name,
                taskId: taskName,
                name: taskName,
                template: block.template,
                testTemplate: block.testTemplate,
                templates: block.templates,
            });
        }
    } else if (block.task !== undefined && block.task > 0) {
        // Автоматическая нумерация: генерируем имена задач от 1 до block.task
        for (let i = 1; i <= block.task; i++) {
            const taskName = block.name + (i < 10 ? '0' + i : i.toString());
            selectedTasks.push({
                block: block.name,
                taskId: taskName,
                name: taskName,
                template: block.template,
                testTemplate: block.testTemplate,
                templates: block.templates,
            });
        }
    }

    return selectedTasks;
}

/**
 * Перемешивание массива алгоритмом Фишера–Йетаса.
 * Возвращает новый массив, оригинал не мутирует.
 */
export function shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
