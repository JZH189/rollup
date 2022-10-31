const name = 'victor jiang';
const age = 17;

function foo() {
	console.log(123);
	function innerFunc() {
		// tree shaking
		console.log(3);
	}
	return 'foo';
	var bar = 'bar'; // 函数已经返回了，这里的赋值语句永远不会执行
}

export { name, age, foo };
