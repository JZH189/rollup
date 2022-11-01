import * as acorn from 'acorn';
import type ExternalModule from './ExternalModule';
import Module from './Module';
import { ModuleLoader, type UnresolvedModule } from './ModuleLoader';
import GlobalScope from './ast/scopes/GlobalScope';
import { PathTracker } from './ast/utils/PathTracker';
import type {
	ModuleInfo,
	ModuleJSON,
	NormalizedInputOptions,
	RollupCache,
	RollupWatcher,
	SerializablePluginCache,
	WatchChangeHook
} from './rollup/types';
import { PluginDriver } from './utils/PluginDriver';
import Queue from './utils/Queue';
import { BuildPhase } from './utils/buildPhase';
import {
	error,
	errorCircularDependency,
	errorImplicitDependantIsNotIncluded,
	errorMissingExport
} from './utils/error';
import { analyseModuleExecution } from './utils/executionOrder';
import { addAnnotations } from './utils/pureComments';
import { timeEnd, timeStart } from './utils/timers';
import { markModuleAndImpureDependenciesAsExecuted } from './utils/traverseStaticDependencies';

function normalizeEntryModules(
	entryModules: readonly string[] | Record<string, string>
): UnresolvedModule[] {
	if (Array.isArray(entryModules)) {
		return entryModules.map(id => ({
			fileName: null,
			id,
			implicitlyLoadedAfter: [],
			importer: undefined,
			name: null
		}));
	}
	return Object.entries(entryModules).map(([name, id]) => ({
		fileName: null,
		id,
		implicitlyLoadedAfter: [],
		importer: undefined,
		name
	}));
}

export default class Graph {
	readonly acornParser: typeof acorn.Parser;//使用acornParser解析ast
	readonly cachedModules = new Map<string, ModuleJSON>();//缓存的modules,提升性能
	readonly deoptimizationTracker = new PathTracker();
	entryModules: Module[] = []; //入口模块
	readonly fileOperationQueue: Queue;
	readonly moduleLoader: ModuleLoader; //模块加载器
	readonly modulesById = new Map<string, Module | ExternalModule>(); //使用Map结构来保存modules
	needsTreeshakingPass = false;
	phase: BuildPhase = BuildPhase.LOAD_AND_PARSE; // 构建的 phase 标志
	readonly pluginDriver: PluginDriver; // 插件驱动
	readonly scope = new GlobalScope(); // 作用域
	readonly watchFiles: Record<string, true> = Object.create(null);
	watchMode = false;

	private readonly externalModules: ExternalModule[] = [];//外部的modules
	private implicitEntryModules: Module[] = [];//隐式入口模块
	private modules: Module[] = []; //保存的模块
	private declare pluginCache?: Record<string, SerializablePluginCache>;

	constructor(private readonly options: NormalizedInputOptions, watcher: RollupWatcher | null) {
		//初始化的时候option.cache = undefined
		if (options.cache !== false) {
			if (options.cache?.modules) {
				for (const module of options.cache.modules) this.cachedModules.set(module.id, module);
			}
			this.pluginCache = options.cache?.plugins || Object.create(null);

			// increment access counter
			for (const name in this.pluginCache) {
				const cache = this.pluginCache[name];
				for (const value of Object.values(cache)) value[0]++;
			}
		}
		// 默认情况下 watcher 为null
		if (watcher) {
			this.watchMode = true;
			const handleChange = (...parameters: Parameters<WatchChangeHook>) =>
				this.pluginDriver.hookParallel('watchChange', parameters);
			const handleClose = () => this.pluginDriver.hookParallel('closeWatcher', []);
			watcher.onCurrentRun('change', handleChange);
			watcher.onCurrentRun('close', handleClose);
		}
		//初始化插件
		this.pluginDriver = new PluginDriver(this, options, options.plugins, this.pluginCache);
		//使用acorn解析ast，并且扩展用户自定义配置
		this.acornParser = acorn.Parser.extend(...(options.acornInjectPlugins as any[]));
		//初始化 moduleLoader
		this.moduleLoader = new ModuleLoader(this, this.modulesById, this.options, this.pluginDriver);
		this.fileOperationQueue = new Queue(options.maxParallelFileOps);
	}

	async build(): Promise<void> {
		timeStart('generate module graph', 2);
		/**
		 * generateModuleGraph 方法主要做了以下事情：
		 * 1、通过 input 配置找出入口模块(entryModules)
		 * 2、从 entryModules 分析、读取所有依赖模块并生成 Module 实例
		 * 3、设置各模块的 dependences 和依赖模块的 importers
		 * 4、创建全局作用域、模块作用域
		 * 5、添加 watchFiles
		 */
		await this.generateModuleGraph();
		timeEnd('generate module graph', 2);

		timeStart('sort and bind modules', 2);
		this.phase = BuildPhase.ANALYSE;
		//按照引入顺序排序模块
		this.sortModules();
		timeEnd('sort and bind modules', 2);

		timeStart('mark included statements', 2);
		//遍历所有的ast.node并且修改node.included的值
		this.includeStatements();
		timeEnd('mark included statements', 2);

		this.phase = BuildPhase.GENERATE;
	}

	contextParse(code: string, options: Partial<acorn.Options> = {}): acorn.Node {
		const onCommentOrig = options.onComment;
		const comments: acorn.Comment[] = [];

		options.onComment =
			onCommentOrig && typeof onCommentOrig == 'function'
				? (block, text, start, end, ...parameters) => {
						comments.push({ end, start, type: block ? 'Block' : 'Line', value: text });
						return onCommentOrig.call(options, block, text, start, end, ...parameters);
				  }
				: comments;

		const ast = this.acornParser.parse(code, {
			...(this.options.acorn as unknown as acorn.Options),
			...options
		});

		if (typeof onCommentOrig == 'object') {
			onCommentOrig.push(...comments);
		}

		options.onComment = onCommentOrig;

		addAnnotations(comments, ast, code);

		return ast;
	}

	getCache(): RollupCache {
		// handle plugin cache eviction
		for (const name in this.pluginCache) {
			const cache = this.pluginCache[name];
			let allDeleted = true;
			for (const [key, value] of Object.entries(cache)) {
				if (value[0] >= this.options.experimentalCacheExpiry) delete cache[key];
				else allDeleted = false;
			}
			if (allDeleted) delete this.pluginCache[name];
		}

		return {
			modules: this.modules.map(module => module.toJSON()),
			plugins: this.pluginCache
		};
	}

	getModuleInfo = (moduleId: string): ModuleInfo | null => {
		const foundModule = this.modulesById.get(moduleId);
		if (!foundModule) return null;
		return foundModule.info;
	};

	private async generateModuleGraph(): Promise<void> {
		/**
		 * normalizeEntryModules(this.options.input) => '[{"fileName":null,"id":"c:\\Users\\Walmart\\Desktop\\study\\rollup-2.52.6\\example/index.js","implicitlyLoadedAfter":[],"name":null}]'
		 */
		({ entryModules: this.entryModules, implicitEntryModules: this.implicitEntryModules } =
			await this.moduleLoader.addEntryModules(normalizeEntryModules(this.options.input), true));
		if (this.entryModules.length === 0) {
			throw new Error('You must supply options.input to rollup');
		}
		for (const module of this.modulesById.values()) {
			if (module instanceof Module) {
				this.modules.push(module);
			} else {
				this.externalModules.push(module);
			}
		}
	}

	private includeStatements(): void {
		for (const module of [...this.entryModules, ...this.implicitEntryModules]) {
			markModuleAndImpureDependenciesAsExecuted(module);
		}
		if (this.options.treeshake) {
			let treeshakingPass = 1;
			do {
				timeStart(`treeshaking pass ${treeshakingPass}`, 3);
				this.needsTreeshakingPass = false;
				for (const module of this.modules) {
					if (module.isExecuted) {
						if (module.info.moduleSideEffects === 'no-treeshake') {
							module.includeAllInBundle();
						} else {
							module.include();
						}
					}
				}
				if (treeshakingPass === 1) {
					// 仅需在第一次的时候将模块内的导出语句包含进来
					for (const module of [...this.entryModules, ...this.implicitEntryModules]) {
						if (module.preserveSignature !== false) {
							module.includeAllExports(false);
							this.needsTreeshakingPass = true;
						}
					}
				}
				timeEnd(`treeshaking pass ${treeshakingPass++}`, 3);
			} while (this.needsTreeshakingPass);
		} else {
			for (const module of this.modules) module.includeAllInBundle();
		}
		for (const externalModule of this.externalModules) externalModule.warnUnusedImports();
		for (const module of this.implicitEntryModules) {
			for (const dependant of module.implicitlyLoadedAfter) {
				if (!(dependant.info.isEntry || dependant.isIncluded())) {
					error(errorImplicitDependantIsNotIncluded(dependant));
				}
			}
		}
	}

	private sortModules(): void {
		const { orderedModules, cyclePaths } = analyseModuleExecution(this.entryModules);
		for (const cyclePath of cyclePaths) {
			this.options.onwarn(errorCircularDependency(cyclePath));
		}
		this.modules = orderedModules;
		for (const module of this.modules) {
			module.bindReferences();
		}
		this.warnForMissingExports();
	}

	private warnForMissingExports(): void {
		for (const module of this.modules) {
			for (const importDescription of module.importDescriptions.values()) {
				if (
					importDescription.name !== '*' &&
					!importDescription.module.getVariableForExportName(importDescription.name)[0]
				) {
					module.warn(
						errorMissingExport(importDescription.name, module.id, importDescription.module.id),
						importDescription.start
					);
				}
			}
		}
	}
}
