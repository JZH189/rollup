import process from 'node:process';
import help from 'help.md';
import { version } from 'package.json';
import argParser from 'yargs-parser';
import { commandAliases } from '../src/utils/options/mergeOptions';
import run from './run/index';

/**
commandAliases: {
	c: 'config',
	d: 'dir',
	e: 'external',
	f: 'format',
	g: 'globals',
	h: 'help',
	i: 'input',
	m: 'sourcemap',
	n: 'name',
	o: 'file',
	p: 'plugin',
	v: 'version',
	w: 'watch'
};
 */
// process 是一个全局变量，即 global 对象的属性。
// 它用于描述当前Node.js 进程状态的对象，提供了一个与操作系统的简单接口。
// process.argv 属性返回一个数组，由命令行执行脚本时的各个参数组成。
// 它的第一个成员总是node，第二个成员是脚本文件名，其余成员是脚本文件的参数。
// process.argv:  [
//   'C:\\Program Files\\nodejs\\node.exe',
//   'C:\\Program Files\\nodejs\\node_modules\\rollup\\dist\\bin\\rollup'
// ]
/**
 * 1. process.argv.slice(2) 则是从 argv数组下标为2的元素开始直到末尾提取元素，举例来说就是提取诸如 rollup -h 中除了 rollup 之外的参数
 * 2. yargs-parser这个包的作用是把命令行参数转换为json对象，方便访问。
 * 例如："rollup -h" 会被argParser解析成 { _: [], h: true, help: true }
 * "rollup --help" 会被argParser解析成 { _: [], help: true, h: true }
 * 'camel-case-expansion' 表示连字符参数是否应该扩展为驼峰大小写别名？默认是true.
 * 例如： node example.js --foo-bar 会被解析成 { _: [], 'foo-bar': true, fooBar: true }
 *
 */
const command = argParser(process.argv.slice(2), {
	alias: commandAliases, //alias参数表示键的别名对象
	configuration: { 'camel-case-expansion': false } //为 argParser 解析器提供配置选项, 'camel-case-expansion': false 表示连字符参数不会被扩展为驼峰大小写别名
});

//process.stdin.isTTY 用于检测我们的程序是否直接连到终端
if (command.help || (process.argv.length <= 2 && process.stdin.isTTY)) {
	console.log(`\n${help.replace('__VERSION__', version)}\n`);
} else if (command.version) {
	console.log(`rollup v${version}`);
} else {
	try {
		// eslint-disable-next-line unicorn/prefer-module
		//浏览器是支持source maps的，但node环境原生不支持source maps。所以我们可以通过'source-map-support'包来实现这个功能。这样当程序执行出错的时候方便通过控制台定位到源码位置。
		require('source-map-support').install();
	} catch {
		// do nothing
	}

	run(command);
}
