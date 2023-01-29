// rollup-plugin-first
function first() {
	return {
		name: 'first',
		//用于替换或操作传递给 rollup.rollup 的选项对象，返回 null 不会替换任何内容。
		options(InputOptions) {
			// console.log('options: ', InputOptions);
			return null;
		},
		//当您需要访问传递给 rollup.rollup 的选项时，这是比较推荐使用的钩子，因为它包含了未设置的默认值。
		/**
      order："pre" 选项值表示请先运行此插件。
      order："post" 选项值表示请最后一个运行此插件。
      order：null 表示在用户指定的位置运行。
     */
		buildStart: {
			sequential: true,
			order: 'post',
			handler(InputOptions) {
				console.log('first buildStart');
				return null;
			}
		},
		resolveId(source, importer, options) {
			//...
		},
		load(id) {
			console.log('id: ', id);
		}
	};
}

module.exports = first;
