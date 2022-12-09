import { age, foo, name } from './user';
import isReference from 'is-reference';
const fname = foo();
if (0) {
	console.log('这段代码不会被执行');
} else {
	const result = isReference('');
	console.log('result: ', result);
	console.log('这段代码保留');
}
// 导出一个foo函数
export default function hello() {
	console.log(fname);
	console.log(`hello! ${name}`);
}
