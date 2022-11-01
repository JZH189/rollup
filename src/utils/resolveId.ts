import type { ModuleLoaderResolveId } from '../ModuleLoader';
import type { CustomPluginOptions, Plugin, ResolveIdResult } from '../rollup/types';
import type { PluginDriver } from './PluginDriver';
import { promises as fs } from './fs';
import { basename, dirname, isAbsolute, resolve } from './path';
import { resolveIdViaPlugins } from './resolveIdViaPlugins';

export async function resolveId(
	source: string,
	importer: string | undefined,
	preserveSymlinks: boolean,
	pluginDriver: PluginDriver,
	moduleLoaderResolveId: ModuleLoaderResolveId,
	skip: readonly { importer: string | undefined; plugin: Plugin; source: string }[] | null,
	customOptions: CustomPluginOptions | undefined,
	isEntry: boolean,
	assertions: Record<string, string>
): Promise<ResolveIdResult> {
	const pluginResult = await resolveIdViaPlugins(
		source,
		importer,
		pluginDriver,
		moduleLoaderResolveId,
		skip,
		customOptions,
		isEntry,
		assertions
	);
	if (pluginResult != null) return pluginResult;

	// external modules (non-entry modules that start with neither '.' or '/')
	// are skipped at this stage.  自动跳过不以“.”或者“/”开头的外部模块
	if (importer !== undefined && !isAbsolute(source) && source[0] !== '.') return null;

	// `resolve` processes paths from right to left, prepending them until an
	// absolute path is created. Absolute importees therefore shortcircuit the
	// resolve call and require no special handing on our part.
	// See https://nodejs.org/api/path.html#path_path_resolve_paths
	/**
	 * path.resolve() 该方法将一些的 路径/路径段 解析为绝对路径。
	 * 语法：path.resolve( [from…],to )
	 * 说明：将参数to位置的字符解析到一个绝对路径里，[from … ]为选填项，路径源
	 * 用法：
	 * path.resolve('/foo/bar', './baz')             // returns '/foo/bar/baz'
	 * path.resolve('/foo/bar', 'baz')               // returns '/foo/bar/baz'
	 * path.resolve('/foo/bar', '/baz')              // returns '/baz'
	 * path.resolve('/foo/bar', '../baz')            // returns '/foo/baz'
	 * path.resolve('home','/foo/bar', '../baz')     // returns '/foo/baz'
	 * path.resolve('home','./foo/bar', '../baz')    // returns '/home/foo/baz'
	 * path.resolve('home','foo/bar', '../baz')      // returns '/home/foo/baz'
	 * path.resolve('home', 'foo', 'build','aaaa','aadada','../../..', 'asset')  // return '/home/foo/asset'
	 * 总结：从后向前，若字符以 / 开头，不会拼接到前面的路径；若以 …/ 开头，拼接前面的路径，且不含最后一节路径；
	 * 若连续出现多个…/…/…或者…/…则忽略前方…个路径名进行拼接；若以 ./ 开头 或者没有符号 则拼接前面路径；
	 * path.resolve总是返回一个以相对于当前的工作目录（working directory）的绝对路径。
	 */
	return addJsExtensionIfNecessary(
		importer ? resolve(dirname(importer), source) : resolve(source),
		preserveSymlinks
	);
}

async function addJsExtensionIfNecessary(
	file: string,
	preserveSymlinks: boolean
): Promise<string | undefined> {
	//file => 'c:\Users\Walmart\Desktop\study\rollup-master\rollup\example\user'
	return (
		(await findFile(file, preserveSymlinks)) ??
		(await findFile(file + '.mjs', preserveSymlinks)) ??
		(await findFile(file + '.js', preserveSymlinks))
	);
}

async function findFile(file: string, preserveSymlinks: boolean): Promise<string | undefined> {
	try {
		const stats = await fs.lstat(file);
		if (!preserveSymlinks && stats.isSymbolicLink())
			return await findFile(await fs.realpath(file), preserveSymlinks);
		if ((preserveSymlinks && stats.isSymbolicLink()) || stats.isFile()) {
			// check case
			const name = basename(file);
			const files = await fs.readdir(dirname(file));

			if (files.includes(name)) return file;
		}
	} catch {
		// suppress
	}
}
