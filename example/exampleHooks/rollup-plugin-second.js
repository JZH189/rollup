// rollup-plugin-second
function second() {
	return {
		name: 'second',
		//用于替换或操作传递给 rollup.rollup 的选项对象，返回 null 不会替换任何内容。
		options(InputOptions) {
			// console.log('options: ', InputOptions);
			return null;
		},
		//当您需要访问传递给 rollup.rollup 的选项时，这是比较推荐使用的钩子，因为它包含了未设置的默认值。
		buildStart: {
			// sequential: true, //设置了此选项则不入栈，优先执行
			first: true,
			handler(InputOptions) {
				console.log('second buildStart: ');
				return null;
			}
		}
	};
}

module.exports = second;
