const acorn = require('acorn');
function visit(node, parent, enter, leave) {
	if (enter) {
		enter.call(null, node, parent);
	}
	const keys = Object.keys(node).filter(key => typeof node[key] === 'object');
	for (const key of keys) {
		const value = node[key];
		if (Array.isArray(value)) {
			for (const value_ of value) {
				visit(value_, node, enter, leave);
			}
		} else if (value && value.type) {
			visit(value, node, enter, leave);
		}
	}
	if (leave) {
		leave.call(null, node, parent);
	}
}
function walk(node, enter, leave) {
	visit(node, null, enter, leave);
}

const code =
	"import { age, foo, name } from './user';const fname = foo();if (0) {console.log('这段代码不会被执行');} else {console.log('这段代码保留');}// 导出一个foo函数export default function hello() {console.log(fname);console.log(`hello! ${name}`);}";

const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
// console.log('ast: ', JSON.stringify(ast));

walk(
	ast.body,
	node => {
		// node.type && console.log('enter--->', node.type);
	},
	node => {
		// node.type && console.log('leave<---', node.type);
	}
);
