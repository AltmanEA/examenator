// Конфигурация сборки esbuild.
// Расширение собирается в единый бандл dist/extension.js — это обязательно
// для веб-версии (vscode.dev / github.dev): web extension host не умеет
// резолвить require('./модуль') отдельных файлов расширения.
import esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const watchOptions = watch
	? {
			onRebuild(error, result) {
				if (error) {
					console.error('[watch] Сборка завершилась с ошибкой:', error);
				} else {
					console.log('[watch] Сборка обновлена');
				}
			},
		}
	: undefined;

const context = await esbuild.context({
	entryPoints: ['src/extension.ts'],
	bundle: true,
	format: 'cjs',
	target: 'es2022',
	platform: 'neutral',
	outfile: 'dist/extension.js',
	external: ['vscode'],
	minify: production,
	sourcemap: !production,
	sourcesContent: false,
	logLevel: 'info',
});

if (watch) {
	await context.watch(watchOptions);
	console.log('[watch] Сборка запущена в режиме наблюдения...');
} else {
	await context.rebuild();
	await context.dispose();
}
