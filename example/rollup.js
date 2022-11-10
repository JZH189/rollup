const { rollup } = require('../dist/rollup'); //注意稍后我们需要运行在node环境中，所以使用了require,而不是 import 方式
//打包输入配置只给一个入口信息
const inputOption = {
	input: 'example/index.js',
	perf: true
};
//打包输出配置信息就简单点，分别定义输出的js文件格式还有文件名称
const outputOption = {
	format: 'es',
	file: 'example/es.js'
};

async function build() {
	try {
		const { write } = await rollup(inputOption);
		await write(outputOption);
	} catch (error) {
		console.log('error: ', error);
	}
}
//开始打包
build();
