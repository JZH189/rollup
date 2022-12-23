import { a as acorn } from './acorn-bf6b1c54.js';

const name = 'victor jiang';
const age = 17;

function foo() {
	console.log(123);
	return 'foo';
}

var user$2 = /*#__PURE__*/Object.freeze({
	__proto__: null,
	name: name,
	age: age,
	foo: foo
});

console.log('acorn: ', acorn);
const user = Promise.resolve().then(function () { return user$2; });

const fname = foo();
{
	console.log(user);
	console.log('这段代码保留');
}
// 导出一个foo函数
function hello() {
	console.log(fname);
	console.log(`hello! ${name}`);
}

export { hello as default };
