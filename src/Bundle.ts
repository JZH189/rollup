import Chunk from './Chunk';
import ExternalChunk from './ExternalChunk';
import ExternalModule from './ExternalModule';
import type Graph from './Graph';
import Module from './Module';
import type {
	GetManualChunk,
	NormalizedInputOptions,
	NormalizedOutputOptions,
	OutputBundle,
	WarningHandler
} from './rollup/types';
import type { PluginDriver } from './utils/PluginDriver';
import { getChunkAssignments } from './utils/chunkAssignment';
import commondir from './utils/commondir';
import {
	error,
	errorCannotAssignModuleToChunk,
	errorChunkInvalid,
	errorInvalidOption
} from './utils/error';
import { sortByExecutionOrder } from './utils/executionOrder';
import { getGenerateCodeSnippets } from './utils/generateCodeSnippets';
import type { HashPlaceholderGenerator } from './utils/hashPlaceholders';
import { getHashPlaceholderGenerator } from './utils/hashPlaceholders';
import type { OutputBundleWithPlaceholders } from './utils/outputBundle';
import { getOutputBundle } from './utils/outputBundle';
import { isAbsolute } from './utils/path';
import { renderChunks } from './utils/renderChunks';
import { timeEnd, timeStart } from './utils/timers';

export default class Bundle {
	private readonly facadeChunkByModule = new Map<Module, Chunk>();
	private readonly includedNamespaces = new Set<Module>();

	constructor(
		private readonly outputOptions: NormalizedOutputOptions,
		private readonly unsetOptions: ReadonlySet<string>,
		private readonly inputOptions: NormalizedInputOptions,
		private readonly pluginDriver: PluginDriver,
		private readonly graph: Graph
	) {}

	async generate(isWrite: boolean): Promise<OutputBundle> {
		timeStart('GENERATE', 1);
		const outputBundleBase: OutputBundle = Object.create(null);
		// outputBundle 是一个 proxy
		const outputBundle = getOutputBundle(outputBundleBase);
		this.pluginDriver.setOutputBundle(outputBundle, this.outputOptions);

		try {
			timeStart('initialize render', 2);

			await this.pluginDriver.hookParallel('renderStart', [this.outputOptions, this.inputOptions]);

			timeEnd('initialize render', 2);
			timeStart('generate chunks', 2);

			const getHashPlaceholder = getHashPlaceholderGenerator();
			// chunks => [chunk]
			const chunks = await this.generateChunks(outputBundle, getHashPlaceholder);
			if (chunks.length > 1) {
				//校验 outputOptions 选项是否合法
				validateOptionsForMultiChunkOutput(this.outputOptions, this.inputOptions.onwarn);
			}
			this.pluginDriver.setChunkInformation(this.facadeChunkByModule);
			for (const chunk of chunks) {
				chunk.generateExports();
			}

			timeEnd('generate chunks', 2);
			/**
			 * renderChunks 主要作用是生成最终的 outputBundle。
			 * 例如：{index.js: {…}, acorn-bf6b1c54.js: {…}}
			 *
			 */
			await renderChunks(
				chunks,
				outputBundle,
				this.pluginDriver,
				this.outputOptions,
				this.inputOptions.onwarn
			);
		} catch (error_: any) {
			await this.pluginDriver.hookParallel('renderError', [error_]);
			throw error_;
		}

		timeStart('generate bundle', 2);

		await this.pluginDriver.hookSeq('generateBundle', [
			this.outputOptions,
			outputBundle as OutputBundle,
			isWrite
		]);
		this.finaliseAssets(outputBundle);

		timeEnd('generate bundle', 2);
		timeEnd('GENERATE', 1);
		return outputBundleBase;
	}

	private async addManualChunks(
		manualChunks: Record<string, readonly string[]>
	): Promise<Map<Module, string>> {
		const manualChunkAliasByEntry = new Map<Module, string>();
		/**
		 * alias 就是我们定义manualChunks 的 key，例如 acorn
		 * await this.graph.moduleLoader.addAdditionalModules(files) 会得到一个 module[]
		 * chunkEntries
		    [{…}]
				0: {alias: 'acorn', entries: Array(1)}
				length: 1
				[[Prototype]]: Array(0)
				[[Prototype]]: Object
		 */
		const chunkEntries = await Promise.all(
			Object.entries(manualChunks).map(async ([alias, files]) => ({
				alias,
				entries: await this.graph.moduleLoader.addAdditionalModules(files)
			}))
		);
		for (const { alias, entries } of chunkEntries) {
			for (const entry of entries) {
				//内部调用 manualChunkAliasByEntry.set(module, alias)
				addModuleToManualChunk(alias, entry, manualChunkAliasByEntry);
			}
		}
		return manualChunkAliasByEntry;
	}

	private assignManualChunks(getManualChunk: GetManualChunk): Map<Module, string> {
		// eslint-disable-next-line unicorn/prefer-module
		const manualChunkAliasesWithEntry: [alias: string, module: Module][] = [];
		const manualChunksApi = {
			getModuleIds: () => this.graph.modulesById.keys(),
			getModuleInfo: this.graph.getModuleInfo
		};
		for (const module of this.graph.modulesById.values()) {
			if (module instanceof Module) {
				const manualChunkAlias = getManualChunk(module.id, manualChunksApi);
				if (typeof manualChunkAlias === 'string') {
					manualChunkAliasesWithEntry.push([manualChunkAlias, module]);
				}
			}
		}
		manualChunkAliasesWithEntry.sort(([aliasA], [aliasB]) =>
			aliasA > aliasB ? 1 : aliasA < aliasB ? -1 : 0
		);
		const manualChunkAliasByEntry = new Map<Module, string>();
		for (const [alias, module] of manualChunkAliasesWithEntry) {
			addModuleToManualChunk(alias, module, manualChunkAliasByEntry);
		}
		return manualChunkAliasByEntry;
	}

	private finaliseAssets(bundle: OutputBundleWithPlaceholders): void {
		if (this.outputOptions.validate) {
			for (const file of Object.values(bundle)) {
				if ('code' in file) {
					try {
						this.graph.contextParse(file.code, {
							allowHashBang: true,
							ecmaVersion: 'latest'
						});
					} catch (error_: any) {
						this.inputOptions.onwarn(errorChunkInvalid(file, error_));
					}
				}
			}
		}
		this.pluginDriver.finaliseAssets();
	}

	private async generateChunks(
		bundle: OutputBundleWithPlaceholders,
		getHashPlaceholder: HashPlaceholderGenerator
	): Promise<Chunk[]> {
		/**
		 * inlineDynamicImports: 该选项用于内联动态引入，而不是用于创建包含新 Chunk 的独立 bundle。它只在单一输入源时产生作用。
		 * manualChunks: 该选项允许你创建自定义的公共模块。
		 * preserveModules: 该选项将使用原始模块名作为文件名，为所有模块创建单独的 chunk，而不是创建尽可能少的 chunk。
		 *
		 */
		const { inlineDynamicImports, manualChunks, preserveModules } = this.outputOptions;
		// outputOption.manualChunks 既可以是对象，也可以是函数
		/**
		 * this.addManualChunks(manualChunks) 或者 this.assignManualChunks(manualChunks) 都会返回一个 Map<Module, string> 结构的对象。
		 * manualChunkAliasByEntry => {Module, 'acorn'}
		 */
		const manualChunkAliasByEntry =
			typeof manualChunks === 'object'
				? await this.addManualChunks(manualChunks)
				: this.assignManualChunks(manualChunks);
		const snippets = getGenerateCodeSnippets(this.outputOptions);
		const includedModules = getIncludedModules(this.graph.modulesById);
		/**
		 * getAbsoluteEntryModulePaths(includedModules, false) 返回入口模块并且为绝对路径的一个字符串（(module.info.isEntry || preserveModules) && isAbsolute(module.id)）
		 * commondir 会返回路径中代表文件夹的部分
		 * inputBase 就是根路径的意思
		 */
		const inputBase = commondir(getAbsoluteEntryModulePaths(includedModules, preserveModules));
		const externalChunkByModule = getExternalChunkByModule(
			this.graph.modulesById,
			this.outputOptions,
			inputBase
		);
		const chunks: Chunk[] = [];
		const chunkByModule = new Map<Module, Chunk>();
		/**
		 * 如果没有在配置文件中手动设置 preserveModules 和 inlineDynamicImports 则他们都默认为 false 。
		 * 因此执行的是 getChunkAssignments(this.graph.entryModules, manualChunkAliasByEntry) 
		 */
		for (const { alias, modules } of inlineDynamicImports
			? [{ alias: null, modules: includedModules }]
			: preserveModules
			? includedModules.map(module => ({ alias: null, modules: [module] }))
			: getChunkAssignments(this.graph.entryModules, manualChunkAliasByEntry)) {
			sortByExecutionOrder(modules);
			const chunk = new Chunk(
				modules,
				this.inputOptions,
				this.outputOptions,
				this.unsetOptions,
				this.pluginDriver,
				this.graph.modulesById,
				chunkByModule,
				externalChunkByModule,
				this.facadeChunkByModule,
				this.includedNamespaces,
				alias,
				getHashPlaceholder,
				bundle,
				inputBase,
				snippets
			);
			chunks.push(chunk);
		}
		for (const chunk of chunks) {
			chunk.link();
		}
		const facades: Chunk[] = [];
		for (const chunk of chunks) {
			facades.push(...chunk.generateFacades());
		}
		return [...chunks, ...facades];
	}
}

function validateOptionsForMultiChunkOutput(
	outputOptions: NormalizedOutputOptions,
	onWarn: WarningHandler
) {
	if (outputOptions.format === 'umd' || outputOptions.format === 'iife')
		return error(
			errorInvalidOption(
				'output.format',
				'outputformat',
				'UMD and IIFE output formats are not supported for code-splitting builds',
				outputOptions.format
			)
		);
	if (typeof outputOptions.file === 'string')
		return error(
			errorInvalidOption(
				'output.file',
				'outputdir',
				'when building multiple chunks, the "output.dir" option must be used, not "output.file". To inline dynamic imports, set the "inlineDynamicImports" option'
			)
		);
	if (outputOptions.sourcemapFile)
		return error(
			errorInvalidOption(
				'output.sourcemapFile',
				'outputsourcemapfile',
				'"output.sourcemapFile" is only supported for single-file builds'
			)
		);
	if (!outputOptions.amd.autoId && outputOptions.amd.id)
		onWarn(
			errorInvalidOption(
				'output.amd.id',
				'outputamd',
				'this option is only properly supported for single-file builds. Use "output.amd.autoId" and "output.amd.basePath" instead'
			)
		);
}

function getIncludedModules(modulesById: ReadonlyMap<string, Module | ExternalModule>): Module[] {
	const includedModules: Module[] = [];
	for (const module of modulesById.values()) {
		if (
			module instanceof Module &&
			(module.isIncluded() || module.info.isEntry || module.includedDynamicImporters.length > 0)
		) {
			includedModules.push(module);
		}
	}
	return includedModules;
}

function getAbsoluteEntryModulePaths(
	includedModules: Module[],
	preserveModules: boolean
): string[] {
	const absoluteEntryModulePaths: string[] = [];
	for (const module of includedModules) {
		if ((module.info.isEntry || preserveModules) && isAbsolute(module.id)) {
			absoluteEntryModulePaths.push(module.id);
		}
	}
	return absoluteEntryModulePaths;
}

function getExternalChunkByModule(
	modulesById: ReadonlyMap<string, Module | ExternalModule>,
	outputOptions: NormalizedOutputOptions,
	inputBase: string
): Map<ExternalModule, ExternalChunk> {
	const externalChunkByModule = new Map<ExternalModule, ExternalChunk>();
	for (const module of modulesById.values()) {
		if (module instanceof ExternalModule) {
			externalChunkByModule.set(module, new ExternalChunk(module, outputOptions, inputBase));
		}
	}
	return externalChunkByModule;
}

function addModuleToManualChunk(
	alias: string,
	module: Module,
	manualChunkAliasByEntry: Map<Module, string>
): void {
	const existingAlias = manualChunkAliasByEntry.get(module);
	if (typeof existingAlias === 'string' && existingAlias !== alias) {
		return error(errorCannotAssignModuleToChunk(module.id, alias, existingAlias));
	}
	manualChunkAliasByEntry.set(module, alias);
}
