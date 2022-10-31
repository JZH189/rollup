## 简介

Rollup 是一个 JavaScript 模块打包器，可以将小块代码打包成大块复杂的代码，例如 library 或应用程序。Rollup 对代码模块使用新的标准化格式（ES module），这些标准都包含在 JavaScript 的 ES6 版本中，而不是以前的特殊解决方案，如 CommonJS 和 AMD。ES6 模块可以使你自由、无缝地使用你最喜爱的 library 中那些最有用独立函数，而让你的项目中不会存在任何多余的代码。

## rollup是如何打包的

在rollup中，一个js文件就是一个模块。rollup会读取每个js文件中的代码并且生成抽象语法树（AST）。rollup 会对每一个AST节点分析。例如分析有没有调用某个变量、函数等，如果有就会查看调用的方法或者变量是否在当前运行作用域，如果当前作用域找不到就会一直往源头找（通过import标识）直到找到模块顶级作用域为止。最后将所有的代码打包到同一个文件中。

## rollup可以输出哪些格式的文件

rollup打包支持输出 amd , cjs , esm , iife , umd , system 六种格式的文件。

## 源码目录结构

此文档是基于rollup-2.52.6版本的源码进行分析，核心源码在src文件夹中。

```JavaScript
src
├─ ast         //源码分析模块
├─ finalisers  //打包输出格式定义
├─ Graph.ts    //依赖图谱类
├─ Module.ts   //模块类
├─ ModuleLoader.ts  //模块加载
├─ rollup      //rollup函数定义
├─ utils       //工具函数
└─ watch       //监听函数
```

