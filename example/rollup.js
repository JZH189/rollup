const { rollup } = require('../dist/rollup'); //注意稍后我们需要运行在node环境中，所以使用了require,而不是 import 方式
//打包输入配置只给一个入口信息import { entry } from '../test/function/samples/duplicate-input-entry/entry';

const inputOption = {
	input: 'example/index.js'
};
//打包输出配置信息就简单点，分别定义输出的js文件格式还有文件名称
const outputOption = {
	file: 'example/es.js',
	format: 'es'
};

async function build() {
	try {
		const { write } = await rollup(inputOption);
		await write(outputOption);
	} catch (error) {
		console.log('error:', error);
	}
}
//开始打包
build();
