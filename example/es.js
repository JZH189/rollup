const name = 'victor jiang';
const age = 17;

function foo() {
	console.log(123);
	return 'foo';
}

var user = /*#__PURE__*/Object.freeze({
	__proto__: null,
	name: name,
	age: age,
	foo: foo
});

const fname = foo();
let helloKety = async () => {
	const { name } = await Promise.resolve().then(function () { return user; });
	console.log('hello: ', name);
};
helloKety();
{
	console.log('这段代码保留');
}
// 导出一个foo函数
function hello() {
	console.log(fname);
	console.log(`hello! ${name}`);
}

export { hello as default };
