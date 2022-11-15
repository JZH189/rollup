import { age, foo, name } from './user';
const fname = foo();
let helloKety = async () => {
	const { name } = await import('./user');
	console.log('hello: ', name);
};
helloKety();
if (0) {
	console.log('这段代码不会被执行');
} else {
	console.log('这段代码保留');
}
// 导出一个foo函数
export default function hello() {
	console.log(fname);
	console.log(`hello! ${name}`);
}
