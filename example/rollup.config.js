// 使用插件
const { resolve } = require('path');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const aliasPlugin = require('./exampleHooks/rollup-plugin-alias');
const firstPlugin = require('./exampleHooks/rollup-plugin-first');
const secondPlugin = require('./exampleHooks/rollup-plugin-second');
const projectRootDir = resolve(__dirname);
console.log('projectRootDir: ', projectRootDir);
//注意：此配置文件需要运行在node中,因此采用cjs语法
module.exports = {
	input: 'example/index.js',
	// external: ['acorn'],
	output: {
		// file: 'dest/bundle.js',
		dir: 'example/dest',
		format: 'es',
		manualChunks: {
			acorn: ['acorn']
		}
	},
	plugins: [
		nodeResolve(),
		firstPlugin(),
		secondPlugin(),
		aliasPlugin({ entries: [{ source: 'user', replacement: `${projectRootDir}/user.js` }] })
	]
};
