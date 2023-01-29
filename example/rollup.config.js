// 使用插件
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const firstPlugin = require('./hooks/rollup-plugin-first');
const secondPlugin = require('./hooks/rollup-plugin-second');
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
	plugins: [nodeResolve(), firstPlugin(), secondPlugin()]
};
