import { env } from 'node:process';
import type { MergedRollupOptions } from '../../src/rollup/types';
import { errorDuplicateImportOptions, errorFailAfterWarnings } from '../../src/utils/error';
import { isWatchEnabled } from '../../src/utils/options/mergeOptions';
import { getAliasName } from '../../src/utils/relativeId';
import { loadFsEvents } from '../../src/watch/fsevents-importer';
import { handleError } from '../logging';
import type { BatchWarnings } from './batchWarnings';
import build from './build';
import { getConfigPath } from './getConfigPath';
import { loadConfigFile } from './loadConfigFile';
import loadConfigFromCommand from './loadConfigFromCommand';

export default async function runRollup(command: Record<string, any>): Promise<void> {
	console.log('-----command------: ', command);
	let inputSource; //获取input的值
	if (command._.length > 0) {
		//获取非选项值
		//例如终端输入"rollup -i input.js f es"  =>  command:  { _: [ 'f', 'es' ], i: 'input.js', input: 'input.js' }
		if (command.input) {
			handleError(errorDuplicateImportOptions());
		}
		inputSource = command._;
	} else if (typeof command.input === 'string') {
		inputSource = [command.input];
	} else {
		inputSource = command.input;
	}

	if (inputSource && inputSource.length > 0) {
		if (inputSource.some((input: string) => input.includes('='))) {
			//"rollup -i input.js f=es" => { _: [ 'f=es' ], i: 'input.js', input: 'input.js' }
			command.input = {};
			//处理多入口文件的情况
			for (const input of inputSource) {
				const equalsIndex = input.indexOf('=');
				const value = input.slice(Math.max(0, equalsIndex + 1)); //获取等号右边的字符=> “es”
				const key = input.slice(0, Math.max(0, equalsIndex)) || getAliasName(input); //获取等号左边的字符=> “f”

				command.input[key] = value;
			}
		} else {
			//处理单入口文件的情况
			command.input = inputSource;
		}
	}

	if (command.environment) {
		//获取environment参数用于设置process.env.[XX]
		const environment = Array.isArray(command.environment)
			? command.environment
			: [command.environment];

		for (const argument of environment) {
			for (const pair of argument.split(',')) {
				const [key, ...value] = pair.split(':');
				env[key] = value.length === 0 ? String(true) : value.join(':');
			}
		}
	}

	if (isWatchEnabled(command.watch)) {
		//观察模式
		await loadFsEvents();
		const { watch } = await import('./watch-cli');
		watch(command);
	} else {
		//非观察模式
		try {
			const { options, warnings } = await getConfigs(command);
			try {
				//因为配置文件可以返回一个数组，所以需要挨个执行
				for (const inputOptions of options) {
					//内部执行 rollup(inputOptions) 进行打包
					await build(inputOptions, warnings, command.silent);
				}
				if (command.failAfterWarnings && warnings.warningOccurred) {
					warnings.flush();
					handleError(errorFailAfterWarnings());
				}
			} catch (error: any) {
				warnings.flush();
				handleError(error);
			}
		} catch (error: any) {
			handleError(error);
		}
	}
}

async function getConfigs(
	command: any
): Promise<{ options: MergedRollupOptions[]; warnings: BatchWarnings }> {
	if (command.config) {
		//获取配置文件
		const configFile = await getConfigPath(command.config);
		//读取配置文件获取配置项
		const { options, warnings } = await loadConfigFile(configFile, command);
		return { options, warnings };
	}
	return await loadConfigFromCommand(command);
}
