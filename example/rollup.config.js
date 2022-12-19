//注意：此配置文件需要运行在node中,因此采用cjs语法
const { nodeResolve } = require('@rollup/plugin-node-resolve');

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
	plugins: [nodeResolve()]
};
