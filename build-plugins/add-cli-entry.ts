import { chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import MagicString from 'magic-string';
import type { Plugin } from 'rollup';

const CLI_CHUNK = 'bin/rollup';

export default function addCliEntry(): Plugin {
	return {
		buildStart() {
			this.emitFile({
				fileName: CLI_CHUNK,
				id: 'cli/cli.ts',
				preserveSignature: false,
				type: 'chunk'
			});
		},
		name: 'add-cli-entry',
		renderChunk(code, chunkInfo) {
			if (chunkInfo.fileName === CLI_CHUNK) {
				const magicString = new MagicString(code);
				//声明在PowerShell中使用 node来运行
				magicString.prepend('#!/usr/bin/env node\n\n');
				return { code: magicString.toString(), map: magicString.generateMap({ hires: true }) };
			}
			return null;
		},
		writeBundle({ dir }) {
			return chmod(resolve(dir!, CLI_CHUNK), '755'); //修改文件可读写权限，保证执行的权限
			/*
			在Node.js中，可以调用fs模块，有一个方法chmod，可以用来修改文件或目录的读写权限。方法chmod有三个参数，文件路径、读写权限和回调函数，其中读写权限是用代号表示的，
			（1）0600：所有者可读写，其他的用户不行
			（2）0644：所有者可读写，其他的用户只读
			（3）0740：所有者可读写，所有者所在的组只读
			（4）0755：所有者可读写，其他用户可读可执行
			*/
		}
	};
}
