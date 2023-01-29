import { a as acorn } from './acorn-bf6b1c54.js';

const name = 'victor jiang';

function foo() {
	console.log(123);
	return 'foo';
}

console.log('acorn:', acorn);
// const user = import('./user');

const fname = foo();
{
	// console.log(user);
	console.log('这段代码保留');
}
// 导出一个foo函数
function hello() {
	console.log(fname);
	console.log(`hello! ${name}`);
}

export { hello as default };
