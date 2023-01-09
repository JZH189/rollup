# 命令行接口

- <a href="#configurationFiles">配置文件</a>
  - <a href="#intellisense">配置智能提示</a>
- <a href="#javaScriptAPI">使用 JavaScript 调用 Rollup</a>
- <a href="#loadingConfiguration">从 Node package 加载配置</a>
- <a href="#nodeESModules">使用 native Node ES modules 的注意事项</a>
  - <a href="#currentDirectory">获取当前目录</a>
  - <a href="#importJson">导入 package.json</a>
- <a href="#cmmandLineFlag">命令行参数</a>
- <a href="#stdin">从 stdin 读取文件</a>

首先推荐使用命令行来使用 Rollup。如有需要您可以提供可选的 Rollup 配置文件，以简化命令行用法并启用高级 Rollup 功能。

# <a href="#" id="configurationFiles">配置文件</a>

Rollup 配置文件是可选的，但它们功能强大且方便，因此建议使用。配置文件是一个 ES 模块，它导出具有所需选项的默认对象：

```js
export default {
  input: 'src/main.js',
  output: {
    file: 'bundle.js',
    format: 'cjs'
  }
};
```

通常，它被称为 rollup.config.js 或 rollup.config.mjs，位于项目的根目录中。除非使用 --configPlugin 或 --bundleConfigAsCjs 选项，否则 Rollup 将直接使用 Node 导入文件。请注意，使用 native Node ES modules 时有一些注意事项，因为 Rollup 将遵守 [Node ESM semantics](https://nodejs.org/docs/latest-v14.x/api/packages.html#packages_determining_module_system)。

如果要使用 require 和 module.exports 将配置编写为 CommonJS 模块，则应将文件扩展名更改为 .cjs。

您还可以使用其他语言来编写配置文件，例如 TypeScript。为此，请安装相应的 Rollup 插件，如 @rollup/plugin-typescript 并使用 --configPlugin 选项：

```js
rollup --config rollup.config.ts --configPlugin typescript
```

使用 --configPlugin 选项将始终强制您的配置文件转换为 CommonJS。另请查看 [Config Intellisense](https://rollupjs.org/guide/en/#config-intellisense)，了解在配置文件中使用 TypeScript 类型的更多方法。

配置文件支持下面列出的选项。有关每个选项的详细信息，请参阅[big list of options](https://rollupjs.org/guide/en/#big-list-of-options)：

```js
// rollup.config.js

// can be an array (for multiple inputs)
export default {
  // core input options
  external,
  input, // conditionally required
  plugins,

  // advanced input options
  cache,
  onwarn,
  preserveEntrySignatures,
  strictDeprecations,

  // danger zone
  acorn,
  acornInjectPlugins,
  context,
  moduleContext,
  preserveSymlinks,
  shimMissingExports,
  treeshake,

  // experimental
  experimentalCacheExpiry,
  perf,

  // required (can be an array, for multiple outputs)
  output: {
    // core output options
    dir,
    file,
    format, // required
    globals,
    name,
    plugins,

    // advanced output options
    assetFileNames,
    banner,
    chunkFileNames,
    compact,
    entryFileNames,
    extend,
    footer,
    hoistTransitiveImports,
    inlineDynamicImports,
    interop,
    intro,
    manualChunks,
    minifyInternalExports,
    outro,
    paths,
    preserveModules,
    preserveModulesRoot,
    sourcemap,
    sourcemapBaseUrl,
    sourcemapExcludeSources,
    sourcemapFile,
    sourcemapPathTransform,
    validate,

    // danger zone
    amd,
    esModule,
    exports,
    externalLiveBindings,
    freeze,
    indent,
    namespaceToStringTag,
    noConflict,
    preferConst,
    sanitizeFileName,
    strict,
    systemNullSetters
  },

  watch: {
    buildDelay,
    chokidar,
    clearScreen,
    skipWrite,
    exclude,
    include
  }
};
```

您可以从配置文件中导出数组，以一次从多个不相关的输入构建捆绑包，即使在观察模式下也是如此。要使用相同的输入构建不同的捆绑包，请为每个输入提供一系列输出选项：

```js
// rollup.config.js (building more than one bundle)

export default [
  {
    input: 'main-a.js',
    output: {
      file: 'dist/bundle-a.js',
      format: 'cjs'
    }
  },
  {
    input: 'main-b.js',
    output: [
      {
        file: 'dist/bundle-b1.js',
        format: 'cjs'
      },
      {
        file: 'dist/bundle-b2.js',
        format: 'es'
      }
    ]
  }
];
```

如果要异步创建配置，Rollup 还可以处理解析为对象或数组的 Promise。

```js
// rollup.config.js
import fetch from 'node-fetch';
export default fetch('/some-remote-service-or-file-which-returns-actual-config');
```

同样，您也可以这样做：

```js
// rollup.config.js (Promise resolving an array)
export default Promise.all([fetch('get-config-1'), fetch('get-config-2')]);
```

若要将 Rollup 与配置文件一起使用，请传递 --config 或 -c 标志：

```shell
# pass a custom config file location to Rollup
rollup --config my.config.js

# if you do not pass a file name, Rollup will try to load
# configuration files in the following order:
# rollup.config.mjs -> rollup.config.cjs -> rollup.config.js
rollup --config
```

您还可以导出返回上述任何配置格式的函数。此函数将传递当前的命令行参数，以便您可以动态调整配置以遵守例如 --silent。您甚至可以定义自己的命令行选项，如果您在它们前面加上 config：

```js
// rollup.config.js
import defaultConfig from './rollup.default.config.js';
import debugConfig from './rollup.debug.config.js';

export default commandLineArgs => {
  if (commandLineArgs.configDebug === true) {
    return debugConfig;
  }
  return defaultConfig;
};
```

如果现在运行 rollup --config --configDebug，则将使用调试配置。

默认情况下，命令行参数将始终覆盖从配置文件导出的相应值。如果要更改此行为，可以通过从 commandLineArgs 对象中删除命令行参数来使 Rollup 忽略这些参数：

```js
// rollup.config.js
export default commandLineArgs => {
  const inputBase = commandLineArgs.input || 'main.js';

  // this will make Rollup ignore the CLI argument
  delete commandLineArgs.input;
  return {
    input: 'src/entries/' + inputBase,
    output: {...}
  }
}
```

## <a href="#" id="intellisense">配置智能提示</a>

由于 Rollup 附带了 TypeScript 类型，因此您可以利用 IDE 的智能提示和 JSDoc 类型提示：

```js
// rollup.config.js
/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
  /* your config */
};
export default config;
```

或者，您可以使用 defineConfig 帮助程序，它应该提供智能提示，而无需 JSDoc 注释：

```js
// rollup.config.js
import { defineConfig } from 'rollup';

export default defineConfig({
  /* your config */
});
```

除了 RollupOptions 和封装此类型的 defineConfig 帮助程序之外，以下类型也很有用：

- OutputOptions：配置文件的输出部分
- Plugin：提供名称和一些钩子的插件对象。所有钩子都是完全类型的，以帮助插件开发。
- PluginImpl：将选项对象映射到插件对象的函数。大多数公共 Rollup 插件都遵循此模式。

您也可以通过 --configPlugin 选项直接在 TypeScript 中编写配置。使用 TypeScript，您可以直接导入 RollupOptions 类型：

```ts
import type { RollupOptions } from 'rollup';

const config: RollupOptions = {
  /* your config */
};
export default config;
```

# <a href="#" id="javaScriptAPI">使用 JavaScript 调用 Rollup</a>

虽然配置文件提供了一种配置 Rollup 的简单方法，但它们也限制了调用和配置 Rollup 的方式。特别是如果要将 Rollup 结合到另一个打包工具或想要使用 Rollup 更高级的功能，最好以编程方式直接调用 Rollup。

如果你想在某个时候从配置文件切换到使用 JavaScript API，有一些重要的区别需要注意：

- 使用 JavaScript API 时，传递给 rollup.rollup 的配置必须是对象，不能包装在 Promise 或函数中。
- 您不能再使用一系列配置。相反，您应该为每组 inputOptions 运行一次 rollup.rollup。
- 输出选项将被忽略。相反，您应该为每组 outputOptions 运行一次 bundle.generate（outputOptions） 或 bundle.write（outputOptions）。

请看如下示例：

```js
//以编程的方式加载配置文件
loadConfigFile(path.resolve(__dirname, 'rollup.config.js'), { format: 'es' }).then(
  async ({ options }) => {
    for (const optionsObj of options) {
      const { write } = await rollup(optionsObj);
      //为每组 outputOptions 运行 bundle.write
      await Promise.all(optionsObj.output.map(write));
    }
  }
);
```

# <a href="#" id="loadingConfiguration">从 Node package 加载配置</a>

为了互操作性，Rollup 还支持从安装到 node_modules 中的包加载配置文件：

```shell
# this will first try to load the package "rollup-config-my-special-config";
# if that fails, it will then try to load "my-special-config"
rollup --config node:my-special-config
```

# <a href="#" id="nodeESModules">使用 native Node ES modules 的注意事项</a>

特别是在从较旧的 Rollup 版本升级时，在配置文件中使用 native Node ES modules 时需要注意一些事项。

## <a href="#" id="currentDirectory">获取当前目录</a>

对于 CommonJS 文件，人们经常使用 \_\_dirname 来访问当前目录并将相对路径解析为绝对路径。native Node ES modules 不支持此功能。相反，我们建议使用以下方法，例如为外部模块生成绝对 id：

```js
// rollup.config.js
import { fileURLToPath } from 'node:url'

export default {
  ...,
  // generates an absolute path for <currentdir>/src/some-external-file.js
  external: [fileURLToPath(new URL('src/some-external-file.js', import.meta.url))]
};
```

## <a href="#" id="importJson">导入 package.json</a>

import package.json 的时候，例如自动将依赖项标记为"external"非常有用。根据您的 Node.js 版本，有不同的方法可以做到这一点：

- 对于 Node.js 17.5+ 版本, 你可以直接 import。

```js
import pkg from './package.json' assert { type: 'json' };

export default {
  // Mark package dependencies as "external". Rest of configuration omitted.
  external: Object.keys(pkg.dependencies)
};
```

- 对于老版本的 Node.js, 你可以使用 createRequire

```js
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// ...
```

- 或者直接从磁盘读取和解析文件

```js
// rollup.config.mjs
import { readFileSync } from 'node:fs';

// 使用 import.meta.url 使路径相对于当前源文件而不是 process.cwd()
// For more info: https://nodejs.org/docs/latest-v16.x/api/esm.html#importmetaurl
const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

// ...
```

- 对于什么是 Import Assertions ，我们稍微扩展下：

比如我们经常在借助打包工具的时候会用到这样的引入:

```js
import Component from './component';
import data from './data.json';
import styles from './index.module.css';
```

随着 json modules 和 css modules 加入 Web 标准，原生 JavaScript 也要考虑引入对它们的支持。

但不能就这样引入！假如，我们在浏览器中执行:

```js
import sheet from './styles.css';
```

后端给我们返回了:

```js
Content-Type: application/javascript; charset=utf8;
alert('you are rickrolled!');
```

这可不好。

为什么不用扩展名来区分呢？因为我们有太多资源没有扩展名了。并且 Content-Type 由后端掌控，不够安全。因此，TC39 提案中设计了 import assertion 的方式。

```js
// 同步的
import json from './foo.json' assert { type: 'json' };
// 异步的
const cssModule = await import('./style.css', { assert: { type: 'css' } });
```

assert { type: "json" } 是导入断言（import assertion），它指定了模块应当被解析和导入的格式为 JSON。

# <a href="#" id="cmmandLineFlag">命令行参数</a>

许多选项具有命令行等效项。在这些情况下，使用此处传递的任何参数都将覆盖配置文件。以下是所有受支持选项的列表：

```shell
-c, --config <filename>     如果只使用了 --config 并未指明文件则默认使用 rollup.config.js
-d, --dir <dirname>         chunks 的目录（如果不存在，则打印到控制台）
-e, --external <ids>        要排除的模块 ID，多个模块 ID 以逗号分隔开来
-f, --format <format>       指定输出格式 (amd, cjs, es, iife, umd, system)
-g, --globals <pairs>       逗号分隔的 `moduleID:Global` 列表
-h, --help                  显示帮助信息
-i, --input <filename>      Input 参数，后接 filename
-m, --sourcemap             生成sourcemap (`-m inline` 表示内联)
-n, --name <name>           UMD 格式导出的 Name
-o, --file <output>         单个输出文件（如果不存在，则打印到控制台）
-p, --plugin <plugin>       使用指定的插件（可以重复）
-v, --version               显示 version
-w, --watch                 观察bundle中的文件并根据更改进行重建
--amd.id <id>               AMD 模块的 ID（默认为anonymous）
--amd.autoId                根据区块名称生成 AMD ID
--amd.basePath <prefix>     附加到自动生成的 AMD ID 的路径
--amd.define <name>         用于代替"define"的函数
--amd.forceJsExtensionForImports 在 AMD 导入中使用“.js”扩展名
--assetFileNames <pattern>  emitted assets的 Name pattern
--banner <text>             要插入bundle顶部的代码
--chunkFileNames <pattern>  emitted secondary chunks 的 Name pattern
--compact                   压缩代码
--context <variable>        指定顶级“this”值
--no-dynamicImportInCjs     根据需要编写外部动态 CommonJS 导入
--entryFileNames <pattern>  emitted entry chunks 的 Name pattern
--environment <values>      传递给配置文件的设置
--no-esModule               不添加__esModule属性
--exports <mode>            指定导出模式 (auto, default, named, none)
--extend                    扩展由 --name 定义的全局变量
--no-externalImportAssertions 省略“es”输出中的导入断言
--no-externalLiveBindings   不生成支持实时绑定的代码
--failAfterWarnings         如果build produced warnings，则退出并显示错误
--footer <text>             要插入bundle尾部的代码
--no-freeze                 不冻结命名空间对象
--generatedCode <preset>    要使用的代码功能 （es5/es2015）
--no-hoistTransitiveImports 不要将外部依赖导入到entry chunks中
--no-indent                 不使用缩进
--interop <type>            处理从 AMD/CommonJS 导入的 default/namespace
--inlineDynamicImports      使用动态导入时创建单个bundle
--intro <text>              需要插入到bundle顶部的代码
--no-makeAbsoluteExternalsRelative 防止external imports 进行 normalization
--maxParallelFileOps <value> 设置并行读取的文件数
--minifyInternalExports     强制或禁用内部导出的压缩
--noConflict                为 UMD 全局变量生成 noConflict 方法
--outro <text>              插入到bundle尾部的代码
--perf                      展示 performance timings
--no-preserveEntrySignatures 不生成 entry points 的 facade chunks
--preserveModules           保留模块结构
--preserveModulesRoot       将保留的模块放在根级别的此路径下
--preserveSymlinks          解析文件时不要遵循符号链接
--no-sanitizeFileName       不要替换文件名中的无效字符
--shimMissingExports        为缺少的导出创建程序变量
--silent                    不打印warnings
--sourcemapBaseUrl <url>    发出具有给定基准的absolute sourcemap URLs
--sourcemapExcludeSources   不要在sourcemap中包含source code
--sourcemapFile <file>      指定sourcemap的捆绑包位置
--stdin=ext                 指定用于标准输入的文件扩展名
--no-stdin                  不要从标准中读取“-”
--no-strict                 在 generated modules不使用 `"use strict";`
--strictDeprecations        已弃用功能的引发错误
--no-systemNullSetters      不要将空的 SystemJS 资源库替换为“null”
--no-treeshake              禁用 tree-shaking 优化
--no-treeshake.annotations  忽略纯调用注释
--no-treeshake.moduleSideEffects 假设模块没有副作用
--no-treeshake.propertyReadSideEffects 忽略属性访问的副作用
--no-treeshake.tryCatchDeoptimization 不要关闭 try-catch-tree-shaking
--no-treeshake.unknownGlobalSideEffects 假设未知全局变量不抛出
--waitForBundleInput        等待 bundle 的 input files
--watch.buildDelay <number> 推迟rebuilds
--no-watch.clearScreen      rebuilding 的时候不要清屏
--watch.skipWrite           当使用watching的时候不写入文件
--watch.exclude <files>     从观察模式中排除文件
--watch.include <files>     将watch限制为指定文件
--watch.onStart <cmd>       在“START”事件上运行的命令行程序命令
--watch.onBundleStart <cmd> 在“BUNDLE_START”事件上运行的命令行程序命令
--watch.onBundleEnd <cmd>   在“BUNDLE_END”事件上运行的命令行程序命令
--watch.onEnd <cmd>         在“END”事件上运行的命令行程序命令
--watch.onError <cmd>       在“ERROR”事件上运行的命令行程序命令
--validate                  校验 output
```

下面列出的标志只能通过命令行界面使用。所有其他标志对应并覆盖其配置文件等效项，有关详细信息，请参阅[big list of options](https://rollupjs.org/guide/en/#big-list-of-options)。

- -h/--help
- --configPlugin \<plugin>
- --bundleConfigAsCjs
- -v/--version
- -w/--watch
- --silent
- --failAfterWarnings
- --environment \<values>
- --waitForBundleInput
- --stdin=ext
- --no-stdin
- --watch.onStart \<cmd>, --watch.onBundleStart \<cmd>, --watch.onBundleEnd \<cmd>, --watch.onEnd \<cmd>, --watch.onError \<cmd>

# <a href="#" id="stdin">从 stdin 读取文件</a>

使用命令行界面时，Rollup 还可以从 stdin（标准输入）读取内容：

```shell
echo "export const foo = 42;" | rollup --format cjs --file out.js
```

当此文件包含导入时，Rollup 将尝试相对于当前工作目录解析它们。使用配置文件时，如果入口点的文件名为 -，则 Rollup 将仅使用 stdin 作为入口点。要从 stdin 读取非入口点文件，只需调用 -，例如：

```js
import foo from '-';
```

在任何文件中都会提示 Rollup 尝试从 stdin 读取导入的文件并将默认导出分配给 foo。您可以将 --no-stdin CLI 标志传递给 Rollup 以改为将 - 视为常规文件名。

由于某些插件依赖于文件扩展名来处理文件，因此您可以通过 --stdin=ext 为 stdin 指定文件扩展名，其中 ext 是所需的扩展名。在这种情况下，虚拟文件名将为 -.ext：

```shell
echo '{"foo": 42, "bar": "ok"}' | rollup --stdin=json -p json
```

JavaScript API 将始终将 - 和 -.ext 视为常规文件名。
