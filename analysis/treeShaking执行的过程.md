## treeShaking 实现的原理概述

rollup 将每个 module 视为一个 module scope。首先通过 acorn.parse 解析出 nodeTree,然后深度遍历每个 node 节点，并且通过作用域查找将被引用的变量或者函数节点标记为 included = true，如果变量未被使用则标记为 included = false。最后通过 magicString.remove 或者 magicString.replace 将代码字符串按照节点的 start 和 end 位置进行删除或者替换操作，这样就得到了 module.bundle。最后按照 module 的引用顺序将所有的 module.bundle 代码组合在一起就完成了代码的打包与 treeShaking 的工作。

this.context.includeVariableInModule(this.variable) 用来判断变量或者函数调用是否应该被当前模块包含

## 执行 module.include() 过程

1. graph.build()
2. graph.includeStatements()
3. module.include()
4. this.ast.include() => program.include()
5. node.include()

## rollup bundle 执行的过程

1. rollup.write
2. handleGenerateWrite
3. bundle.generate
4. bundle.prerenderChunks
5. chunk.preRender
6. module.render
7. program.render
8. renderStatementList
9. treeshakeNode
