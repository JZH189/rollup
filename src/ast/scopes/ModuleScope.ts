import type { AstContext } from '../../Module';
import type { InternalModuleFormat } from '../../rollup/types';
import type ExportDefaultDeclaration from '../nodes/ExportDefaultDeclaration';
import { UNDEFINED_EXPRESSION } from '../values';
import ExportDefaultVariable from '../variables/ExportDefaultVariable';
import GlobalVariable from '../variables/GlobalVariable';
import LocalVariable from '../variables/LocalVariable';
import type Variable from '../variables/Variable';
import ChildScope from './ChildScope';
import type GlobalScope from './GlobalScope';

export default class ModuleScope extends ChildScope {
	context: AstContext;
	declare parent: GlobalScope;

	constructor(parent: GlobalScope, context: AstContext) {
		super(parent);
		this.context = context;
		this.variables.set('this', new LocalVariable('this', null, UNDEFINED_EXPRESSION, context));
	}

	addExportDefaultDeclaration(
		name: string,
		exportDefaultDeclaration: ExportDefaultDeclaration,
		context: AstContext
	): ExportDefaultVariable {
		const variable = new ExportDefaultVariable(name, exportDefaultDeclaration, context);
		this.variables.set('default', variable);
		return variable;
	}

	addNamespaceMemberAccess(): void {}

	deconflict(
		format: InternalModuleFormat,
		exportNamesByVariable: ReadonlyMap<Variable, readonly string[]>,
		accessedGlobalsByScope: ReadonlyMap<ChildScope, ReadonlySet<string>>
	): void {
		// all module level variables are already deconflicted when deconflicting the chunk
		for (const scope of this.children)
			scope.deconflict(format, exportNamesByVariable, accessedGlobalsByScope);
	}

	findLexicalBoundary(): this {
		return this;
	}

	findVariable(name: string): Variable {
		//从自身模块或者外部找变量
		const knownVariable = this.variables.get(name) || this.accessedOutsideVariables.get(name);
		if (knownVariable) {
			return knownVariable;
		}
		//从上下文中找变量，也就是从自身模块的importDescriptions对象中找。
		const variable = this.context.traceVariable(name) || this.parent.findVariable(name);
		//如果是外部依赖module中的变量则保存起来方便下次访问
		if (variable instanceof GlobalVariable) {
			this.accessedOutsideVariables.set(name, variable);
		}
		return variable;
	}
}
