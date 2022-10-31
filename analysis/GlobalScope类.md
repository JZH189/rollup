## GlobalScope类

GlobalScope 是 Scope 的子类。

```js
class GlobalScope extends Scope {
	parent: null;

	constructor() {
		super();
		this.variables.set('undefined', new UndefinedVariable());
	}

	findVariable(name: string): Variable {
		let variable = this.variables.get(name);
		if (!variable) {
			variable = new GlobalVariable(name);
			this.variables.set(name, variable);
		}
		return variable;
	}
}
```

```js

class Scope {
	children: ChildScope[] = [];      //子作用域
	variables = new Map<string, Variable>();    //收集变量

	addDeclaration(
		identifier: Identifier,
		context: AstContext,
		init: ExpressionEntity | null,
		_isHoisted: boolean
	): LocalVariable {
		const name = identifier.name;
		let variable = this.variables.get(name) as LocalVariable;
		if (variable) {
			variable.addDeclaration(identifier, init);
		} else {
			variable = new LocalVariable(
				identifier.name,
				identifier,
				init || UNDEFINED_EXPRESSION,
				context
			);
			this.variables.set(name, variable);
		}
		return variable;
	}
  // 判断 variables 内是否包含这个变量
	contains(name: string): boolean {
		return this.variables.has(name);
	}
}


```