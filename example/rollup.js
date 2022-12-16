const { loadConfigFile } = require('../dist/loadConfigFile');
const { rollup } = require('../dist/rollup'); //注意稍后我们需要运行在node环境中，所以使用了require,而不是 import 方式
const path = require('path');
/**
const inputOption = {
	input: 'example/index.js'
};

const outputOption = {
	file: 'example/es.js',
	format: 'es',
	manualChunks: {
		lodash: ['lodash']
	}
};
async function build() {
	try {
		const { write } = await rollup(inputOption);
		await write(outputOption);
	} catch (error) {
		console.log('error:', error);
	}
}
build();
*/

//以编程的方式加载配置文件
loadConfigFile(path.resolve(__dirname, 'rollup.config.js'), { format: 'es' }).then(
	async ({ options }) => {
		for (const optionsObj of options) {
			/**
			{
				acorn: undefined,
				acornInjectPlugins: undefined,
				cache: undefined,
				context: undefined,
				experimentalCacheExpiry: undefined,
				external: [],
				inlineDynamicImports: undefined,
				input: 'example/index.js',
				makeAbsoluteExternalsRelative: undefined,
				manualChunks: undefined,
				maxParallelFileOps: undefined,
				maxParallelFileReads: undefined,
				moduleContext: undefined,
				onwarn: [Function: add],
				perf: undefined,
				plugins: [
					{
						name: 'node-resolve',
						version: '15.0.1',
						buildStart: [Function: buildStart],
						generateBundle: [Function: generateBundle],
						resolveId: [Object],
						load: [Function: load],
						getPackageInfoForId: [Function: getPackageInfoForId]
					},
					{
						load: [Function: load],
						name: 'stdin',
						resolveId: [Function: resolveId]
					}
				],
				preserveEntrySignatures: undefined,
				preserveModules: undefined,
				preserveSymlinks: undefined,
				shimMissingExports: undefined,
				strictDeprecations: undefined,
				treeshake: undefined,
				watch: undefined,
				output: [
					{
						amd: undefined,
						assetFileNames: undefined,
						banner: undefined,
						chunkFileNames: undefined,
						compact: undefined,
						dir: 'dest',
						dynamicImportFunction: undefined,
						dynamicImportInCjs: undefined,
						entryFileNames: undefined,
						esModule: undefined,
						exports: undefined,
						extend: undefined,
						externalImportAssertions: undefined,
						externalLiveBindings: undefined,
						file: undefined,
						footer: undefined,
						format: 'es',
						freeze: undefined,
						generatedCode: undefined,
						globals: undefined,
						hoistTransitiveImports: undefined,
						indent: undefined,
						inlineDynamicImports: undefined,
						interop: undefined,
						intro: undefined,
						manualChunks: [Object],
						minifyInternalExports: undefined,
						name: undefined,
						namespaceToStringTag: undefined,
						noConflict: undefined,
						outro: undefined,
						paths: undefined,
						plugins: [],
						preferConst: undefined,
						preserveModules: undefined,
						preserveModulesRoot: undefined,
						sanitizeFileName: undefined,
						sourcemap: undefined,
						sourcemapBaseUrl: undefined,
						sourcemapExcludeSources: undefined,
						sourcemapFile: undefined,
						sourcemapPathTransform: undefined,
						strict: undefined,
						systemNullSetters: undefined,
						validate: undefined
					}
				]
			}
			 */
			const { write } = await rollup(optionsObj);
			//write 函数会被自动传入三个参数：数组元素，元素索引，原数组本身。
			await Promise.all(optionsObj.output.map(write));
		}
	}
);
