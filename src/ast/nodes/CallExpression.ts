import type MagicString from 'magic-string';
import type { NormalizedTreeshakingOptions } from '../../rollup/types';
import { BLANK } from '../../utils/blank';
import { errorCannotCallNamespace, errorEval } from '../../utils/error';
import { renderCallArguments } from '../../utils/renderCallArguments';
import { type NodeRenderOptions, type RenderOptions } from '../../utils/renderHelpers';
import type { DeoptimizableEntity } from '../DeoptimizableEntity';
import type { HasEffectsContext, InclusionContext } from '../ExecutionContext';
import type { NodeInteractionWithThisArgument } from '../NodeInteractions';
import { INTERACTION_CALLED } from '../NodeInteractions';
import {
	EMPTY_PATH,
	type PathTracker,
	SHARED_RECURSION_TRACKER,
	UNKNOWN_PATH
} from '../utils/PathTracker';
import Identifier from './Identifier';
import MemberExpression from './MemberExpression';
import type * as NodeType from './NodeType';
import type SpreadElement from './SpreadElement';
import type Super from './Super';
import CallExpressionBase from './shared/CallExpressionBase';
import { type ExpressionEntity, UNKNOWN_EXPRESSION } from './shared/Expression';
import { type ExpressionNode, INCLUDE_PARAMETERS, type IncludeChildren } from './shared/Node';

export default class CallExpression extends CallExpressionBase implements DeoptimizableEntity {
	declare arguments: (ExpressionNode | SpreadElement)[];
	declare callee: ExpressionNode | Super;
	declare optional: boolean;
	declare type: NodeType.tCallExpression;

	bind(): void {
		super.bind();
		if (this.callee instanceof Identifier) {
			const variable = this.scope.findVariable(this.callee.name);
			// 例如 import * as user from './user'; 的时候直接使用 user()而不是 user.foo(), 这个user就是一个namespace
			if (variable.isNamespace) {
				this.context.warn(errorCannotCallNamespace(this.callee.name), this.start);
			}
			//如果是eval()函数调用会警告
			if (this.callee.name === 'eval') {
				this.context.warn(errorEval(this.context.module.id), this.start);
			}
		}
		this.interaction = {
			args: this.arguments,
			thisArg:
				this.callee instanceof MemberExpression && !this.callee.variable
					? this.callee.object
					: null,
			type: INTERACTION_CALLED,
			withNew: false
		};
	}

	hasEffects(context: HasEffectsContext): boolean {
		try {
			for (const argument of this.arguments) {
				if (argument.hasEffects(context)) return true;
			}
			if (
				(this.context.options.treeshake as NormalizedTreeshakingOptions).annotations &&
				this.annotations
			)
				return false;
			return (
				this.callee.hasEffects(context) ||
				this.callee.hasEffectsOnInteractionAtPath(EMPTY_PATH, this.interaction, context)
			);
		} finally {
			if (!this.deoptimized) this.applyDeoptimizations();
		}
	}

	include(context: InclusionContext, includeChildrenRecursively: IncludeChildren): void {
		if (!this.deoptimized) this.applyDeoptimizations();
		if (includeChildrenRecursively) {
			super.include(context, includeChildrenRecursively);
			if (
				includeChildrenRecursively === INCLUDE_PARAMETERS &&
				this.callee instanceof Identifier &&
				this.callee.variable
			) {
				this.callee.variable.markCalledFromTryStatement();
			}
		} else {
			this.included = true;
			this.callee.include(context, false);
		}
		this.callee.includeCallArguments(context, this.arguments);
	}

	render(
		code: MagicString,
		options: RenderOptions,
		{ renderedSurroundingElement }: NodeRenderOptions = BLANK
	): void {
		this.callee.render(code, options, {
			isCalleeOfRenderedParent: true,
			renderedSurroundingElement
		});
		renderCallArguments(code, options, this);
	}

	protected applyDeoptimizations(): void {
		this.deoptimized = true;
		if (this.interaction.thisArg) {
			this.callee.deoptimizeThisOnInteractionAtPath(
				this.interaction as NodeInteractionWithThisArgument,
				EMPTY_PATH,
				SHARED_RECURSION_TRACKER
			);
		}
		for (const argument of this.arguments) {
			// This will make sure all properties of parameters behave as "unknown"
			argument.deoptimizePath(UNKNOWN_PATH);
		}
		this.context.requestTreeshakingPass();
	}

	protected getReturnExpression(
		recursionTracker: PathTracker = SHARED_RECURSION_TRACKER
	): ExpressionEntity {
		if (this.returnExpression === null) {
			this.returnExpression = UNKNOWN_EXPRESSION;
			return (this.returnExpression = this.callee.getReturnExpressionWhenCalledAtPath(
				EMPTY_PATH,
				this.interaction,
				recursionTracker,
				this
			));
		}
		return this.returnExpression;
	}
}
