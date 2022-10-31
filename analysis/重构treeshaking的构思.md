## Algorithmic/architecture changes

算法/架构更改

<p>The main goal was to get rid of custom logic such as isUsedByBundle or assignToForLoopLeft that is hard to maintain and move logic to the individual nodes.</p>
主要目标是摆脱自定义逻辑，例如 isUsedByBundle 或者 assignToForLoopLeft 难以维护的自定义逻辑并将其移动到各个节点。

## included

- The flags used to indicate that something is needed (.activated, .ran, .shouldInclude) have been replaced by a single flag, .included. This flag is used by both nodes and other declarations and is usually set via .includeInBundle() for nodes and .includeDeclaration() for declarations. This distinction was necessary to be able to include side-effects of a default export without including the export itself.

  - A declaration (node) that is added via .includeInBundle() assumes that it is only included due to side-effects but not necessarily used. Therefore, it does not set its .included flag but includes children that .shouldBeIncluded() (see below)
  - A declaration that is added via .includeDeclaration() assumes that it is being used

- 用于指示需要某些内容的标志（.activated，.ran，.shouldInclude）已被单个标志 .include 取代。此标志由 nodes 和其他 declarations 使用。通常通过 .includeInBundle() 为 nodes 设置，通过 .includeDeclaration() 为 declarations 进行设置。这种区分是必要的，以便于包含 export 的副作用（例如：export let name = "victor", 此时只有'let name = "victor"' 这段代码被包含进来，抛弃掉 "export" 关键字）
  - 通过 .includeInBundle（） 添加的 declaration（节点）假定它仅由于副作用而被包含，但不一定使用。因此，它不会设置其 .included 标志，但包括 .includeInBundle（）的子级（见下文）
  - 通过添加 .includeDeclaration() 的声明假定它正在被使用

## Bundle

- The concept of dependent expressions has been removed
- Statements or module are no longer "run()"; I found it very hard to understand what running actually means anyway, at least the name did not help
- Instead, we repeatedly call Module.includeInBundle() on each module. If the return value is true for a module, then new nodes or declarations were added by this module. Repeat until all modules return false.

- 删除了依赖表达式的概念
- Statements 或者 module 不再是“run（）”;我发现很难理解 run 到底是什么意思，至少这个名字没有帮助
- 相反，我们在每个模块上反复调用 Module.includeInBundle()。如果模块的返回值为 true，则此模块添加了 nodes 或者 declarations。重复此步骤，直到所有模块都返回 false。

## Module

Module.includeInBundle() includes each node that .shouldBeIncluded(), see below
Module.includeInBundle() 方法包含了所有应该被包含的 node，见下文

## Node

By default, Node inclusion works like this:

- A node .shouldBeIncluded() if it .hasEffects()
- An effect is either a side-effect or the fact that this node has already been included (which certainly has an effect on the bundle)
- .includeInBundle() will return true if this node has not been included yet or any child returns true; the return value signifies if something was added
- .includeInBundle() is cached via .isFullyIncluded() to make sure that only nodes are checked again that are still missing some child nodes

There are other new methods:

- .eachChild() no longer has special logic for rendering shorthand properties. This has been moved to Property.render
- .someChild() is a new helper method which accepts a callback predicate and bails out if the callback returns true for any child
- .assignExpression() and .hasEffectsWhenAssigned() handle the new assignment logic, see below
- .hasEffectsWhenMutated() handles the new mutation logic, see below

默认情况下，节点包含的工作方式如下：

- 一个节点如果 .hasEffects() 返回了 true，则这个节点应该被包含。
- 一个节点要么具有副作用要么它实际存在（这肯定会对 bundle 产生影响）
- 如果尚未包含此节点或任何子节点返回 true，则 .includeInBundle（） 将返回 true;返回值表示是否添加了某些内容
- .includeInBundle() 通过 .isFullyIncluded() 进行缓存，以确保仅再次检查仍然缺少某些子节点的节点

还有其他新方法：

- .eachChild（） 不再具有用于呈现速记属性的特殊逻辑。这已被移动到 Property.render。
- .someChild（） 是一个新的辅助方法，它接受回调谓词，如果回调对于任何子级返回 true，则进行救助
- .assignExpression（） 和 .hasEffectsWhenAssigned() 处理新的赋值逻辑，请参阅下文
- .hasEffectsWhenMutated() 有新的变化，见下文

## Assignments and Mutations

- declaration.possibleValues has been renamed to .assignedExpressions and now only ever receives either actual Nodes or the new UNKNOWN_ASSIGNMENT node. Previously, many different pseudo-values have been assiged here "for debugging purposes" which made the production code more difficult.
- Nodes can now have two new kinds of effects: .hasEffectsWhenAssigned() and .hasEffectsWhenMutated()
- A mutation is usually an added or removed property. In the future it is also conceivable that Object.freeze is treated as a mutation
- A mutation has an effect if a variable is global, can reference something global or is a parameter. Expressions that may return such a value have also effects when mutated (there is still room for further improvement)
- An assignment has an effect when assigning to a global variable or (possibly) a member expression but NOT to a function parameter.
- During bind, .assignExpression() assigns new nodes to declarations that can be checked for mutations etc.

And more that I can no longer remember :)
I hope you like it, feedback always welcome.

## 赋值和突变

- declaration.possibleValues 值已重命名为 .assignedExpressions，现在只接收实际节点或新 UNKNOWN_ASSIGNMENT 节点。以前，许多不同的伪值已经在这里“用于调试目的”，这使得生产代码更加困难。
- 节点现在可以有两种新的副作用：.hasEffectsWhenAssigned() 和 .hasEffectsWhenMutated()
- 节点突变通常是修改或者删除操作。在未来，也可以将 Object.freeze 方法视为突变。
- 如果变量是全局的，可以引用全局性的东西或参数，则突变具有影响。可能返回此类值的表达式在发生突变时也会产生影响（仍有进一步改进的余地）
- 赋值在赋值给全局变量或（可能）成员表达式但未赋值函数参数时有效。
- 在绑定期间，.assignExpression（） 将新节点分配给可以检查突变等的声明。

还有其他的我也记不起来:)
我希望你喜欢它，随时欢迎反馈。
