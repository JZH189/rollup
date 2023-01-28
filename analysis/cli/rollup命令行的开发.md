在学习 rollup CLI 之前我们需要了解 npm 中的 prefix，symlink，Executables 这三个概念。

# prefix

**当我们使用 --global/-g 选项的时候会将包安装到 prefix 目录下，prefix 默认为 node 的安装位置。在大多数系统上，它是 /usr/local。在 Windows 上，它是 %AppData%\npm 目录中。在 Unix 系统上，它向上一级，因为 node 通常安装在{prefix}/bin/node 而不是{prefix}/node.exe。如果未使用 --global/-g 选项的时候，它将安装在当前包的根目录，或者当前工作目录。**

具体请参阅 [folders](https://docs.npmjs.com/cli/v6/configuring-npm/folders)

# symlink

许多包都有一个或多个<font color=#aa1e1e>可执行文件</font>，并且希望将其安装到 PATH 中。npm 刚好提供了这个功能。

如果想要在用户安装包的时候创建可执行文件，请在 package.json 中提供一个 bin 字段，该字段是命令名称到本地文件名的映射。在安装时，npm 会将该文件符号链接到 prefix/bin 以进行全局安装，或 ./node_modules/.bin/ 用于本地安装。

# Executables（可执行文件）

举个例子：

```shell
npm install --global rollup
```

当我们使用上述方式全局安装 rollup 的时候，我们可以 cd 到<font color=#aa1e1e>任何文件目录</font>下直接使用 rollup 命令来使用它。其中的原理就是我们需要了解的<font color=#aa1e1e>可执行文件</font>的概念:

- 在全局模式下，可执行文件在 Unix 上链接到 {prefix}/bin，或在 Windows 上直接链接到 {prefix}。
- 在本地模式下，可执行文件链接到 ./node_modules/.bin 中，以便它们可以可用于通过 npm 运行的脚本。

**简单来说就是当你使用 npm install 的时候 npm 会自动为你创建对应的可执行文件。如果是使用 npm install 的方式则会将对应的可执行文件放在 /node_modules/.bin 目录下。如果使用 npm install --global 的方式，对应的可执行文件在 Unix 上会放在{prefix}/bin 目录，在 Windows 上则是 {prefix} 目录。**

当你执行 npm run 的时候，npm 会在 node 环境变量（Path）中（例如 C:\Users\victorjiang\AppData\Roaming\npm）找到对应的 node 可执行文件并且运行它。可执行文件包括三个：

- rollup：Unix 系默认的可执行文件，必须输入完整文件名
- rollup.cmd：windows cmd 中默认的可执行文件
- rollup.ps1：Windows PowerShell 中可执行文件，可以跨平台

在了解了 prefix，symlink，Executables 这三个概念之后我们就可以开始学习 rollup 的 CLI 的功能了。

# rollup 命令行的开发

Rollup 命令行的源码在项目的根目录的 cli 下：

```JavaScript
cli
├─ run              //定义了runRollup函数，以及加载配置文件等业务代码
├─ cli.ts           //命令行解析入口
├─ help.md          //rollup帮助文档
├─ logging.ts       //handleError方法定义
```

cli/cli.ts 代码定义：

```ts
import process from 'node:process';
import help from 'help.md';
import { version } from 'package.json';
import argParser from 'yargs-parser';
import { commandAliases } from '../src/utils/options/mergeOptions';
import run from './run/index';

/**
commandAliases: {
	c: 'config',
	d: 'dir',
	e: 'external',
	f: 'format',
	g: 'globals',
	h: 'help',
	i: 'input',
	m: 'sourcemap',
	n: 'name',
	o: 'file',
	p: 'plugin',
	v: 'version',
	w: 'watch'
};
 */
// process 是一个全局变量，即 global 对象的属性。
// 它用于描述当前Node.js 进程状态的对象，提供了一个与操作系统的简单接口。
// process.argv 属性返回一个数组，由命令行执行脚本时的各个参数组成。
// 它的第一个成员总是node，第二个成员是脚本文件名，其余成员是脚本文件的参数。
// process.argv:  [
//   'C:\\Program Files\\nodejs\\node.exe',
//   'C:\\Program Files\\nodejs\\node_modules\\rollup\\dist\\bin\\rollup'
// ]
/**
 * 1. process.argv.slice(2) 则是从 argv数组下标为2的元素开始直到末尾提取元素，举例来说就是提取诸如 rollup -h 中除了 rollup 之外的参数
 * 2. yargs-parser这个包的作用是把命令行参数转换为json对象，方便访问。
 * 例如："rollup -h" 会被argParser解析成 { _: [], h: true, help: true }
 * "rollup --help" 会被argParser解析成 { _: [], help: true, h: true }
 * 'camel-case-expansion' 表示连字符参数是否应该扩展为驼峰大小写别名？默认是true.
 * 例如： node example.js --foo-bar 会被解析成 { _: [], 'foo-bar': true, fooBar: true }
 *
 */
const command = argParser(process.argv.slice(2), {
  alias: commandAliases, //alias参数表示键的别名对象
  configuration: { 'camel-case-expansion': false } //为 argParser 解析器提供配置选项, 'camel-case-expansion': false 表示连字符参数不会被扩展为驼峰大小写别名
});

//process.stdin.isTTY 用于检测我们的程序是否直接连到终端
if (command.help || (process.argv.length <= 2 && process.stdin.isTTY)) {
  console.log(`\n${help.replace('__VERSION__', version)}\n`);
} else if (command.version) {
  console.log(`rollup v${version}`);
} else {
  try {
    // eslint-disable-next-line unicorn/prefer-module
    //浏览器是支持source maps的，但node环境原生不支持source maps。所以我们可以通过'source-map-support'包来实现这个功能。这样当程序执行出错的时候方便通过控制台定位到源码位置。
    require('source-map-support').install();
  } catch {
    // do nothing
  }

  run(command);
}
```

上面代码中的 run 方法就是 cli/run/index.ts 中定义的 runRollup 方法，它的主要作用就是为了解析用户输入的命令行参数。

cli/run/index.ts 代码定义：

```ts
import { env } from 'node:process';
import type { MergedRollupOptions } from '../../src/rollup/types';
import { errorDuplicateImportOptions, errorFailAfterWarnings } from '../../src/utils/error';
import { isWatchEnabled } from '../../src/utils/options/mergeOptions';
import { getAliasName } from '../../src/utils/relativeId';
import { loadFsEvents } from '../../src/watch/fsevents-importer';
import { handleError } from '../logging';
import type { BatchWarnings } from './batchWarnings';
import build from './build';
import { getConfigPath } from './getConfigPath';
import { loadConfigFile } from './loadConfigFile';
import loadConfigFromCommand from './loadConfigFromCommand';

export default async function runRollup(command: Record<string, any>): Promise<void> {
  let inputSource; //获取input的值
  if (command._.length > 0) {
    //获取非选项值
    //例如终端输入"rollup -i input.js f es"  =>  command:  { _: [ 'f', 'es' ], i: 'input.js', input: 'input.js' }
    if (command.input) {
      handleError(errorDuplicateImportOptions());
    }
    inputSource = command._;
  } else if (typeof command.input === 'string') {
    inputSource = [command.input];
  } else {
    inputSource = command.input;
  }

  if (inputSource && inputSource.length > 0) {
    if (inputSource.some((input: string) => input.includes('='))) {
      //"rollup -i input.js f=es" => { _: [ 'f=es' ], i: 'input.js', input: 'input.js' }
      command.input = {};
      //处理多入口文件的情况
      for (const input of inputSource) {
        const equalsIndex = input.indexOf('=');
        const value = input.slice(Math.max(0, equalsIndex + 1)); //获取等号右边的字符=> “es”
        const key = input.slice(0, Math.max(0, equalsIndex)) || getAliasName(input); //获取等号左边的字符=> “f”

        command.input[key] = value;
      }
    } else {
      //处理单入口文件的情况
      command.input = inputSource;
    }
  }

  if (command.environment) {
    //获取environment参数用于设置process.env.[XX]
    const environment = Array.isArray(command.environment)
      ? command.environment
      : [command.environment];

    for (const argument of environment) {
      for (const pair of argument.split(',')) {
        const [key, ...value] = pair.split(':');
        env[key] = value.length === 0 ? String(true) : value.join(':');
      }
    }
  }

  if (isWatchEnabled(command.watch)) {
    //观察模式
    await loadFsEvents();
    const { watch } = await import('./watch-cli');
    watch(command);
  } else {
    //非观察模式
    try {
      const { options, warnings } = await getConfigs(command);
      try {
        //因为配置文件可以返回一个数组，所以需要挨个执行
        for (const inputOptions of options) {
          //内部执行 rollup(inputOptions) 进行打包
          await build(inputOptions, warnings, command.silent);
        }
        if (command.failAfterWarnings && warnings.warningOccurred) {
          warnings.flush();
          handleError(errorFailAfterWarnings());
        }
      } catch (error: any) {
        warnings.flush();
        handleError(error);
      }
    } catch (error: any) {
      handleError(error);
    }
  }
}

async function getConfigs(
  command: any
): Promise<{ options: MergedRollupOptions[]; warnings: BatchWarnings }> {
  if (command.config) {
    //获取配置文件
    const configFile = await getConfigPath(command.config);
    //读取配置文件获取配置项
    const { options, warnings } = await loadConfigFile(configFile, command);
    return { options, warnings };
  }
  return await loadConfigFromCommand(command);
}
```

# 打包生成 rollup 文件

在 rollup.config.ts 文件中有导出一个方法:

```ts
//rollup.config.ts

export default async function (
  command: Record<string, unknown>
): Promise<RollupOptions | RollupOptions[]> {
  const { collectLicenses, writeLicense } = getLicenseHandler(
    fileURLToPath(new URL('.', import.meta.url))
  );

  const commonJSBuild: RollupOptions = {
    // 'fsevents' is a dependency of 'chokidar' that cannot be bundled as it contains binary code
    external: ['fsevents'],
    input: {
      'loadConfigFile.js': 'cli/run/loadConfigFile.ts',
      'rollup.js': 'src/node-entry.ts'
    },
    onwarn,
    output: {
      banner: getBanner,
      chunkFileNames: 'shared/[name].js',
      dir: 'dist',
      entryFileNames: '[name]',
      exports: 'named',
      externalLiveBindings: false,
      format: 'cjs',
      freeze: false,
      generatedCode: 'es2015',
      interop: 'default',
      manualChunks: { rollup: ['src/node-entry.ts'] },
      sourcemap: true
    },
    plugins: [
      ...nodePlugins,
      addCliEntry(), //添加cli入口文件
      esmDynamicImport(),
      !command.configTest && collectLicenses(),
      !command.configTest && copyTypes('rollup.d.ts')
    ],
    strictDeprecations: true,
    treeshake
  };
  /**
	 * 
	当我们执行npm run build 的时候就相当于执行了 rollup --config rollup.config.ts --configPlugin typescript
	此时 command 就是如下对象：
	{ 
		_: [],
		config: 'rollup.config.ts',
		c: 'rollup.config.ts',     
		configPlugin: 'typescript' 
	}
	*/
  if (command.configTest) {
    return commonJSBuild;
  }

  const esmBuild: RollupOptions = {
    ...commonJSBuild,
    input: { 'rollup.js': 'src/node-entry.ts' },
    output: {
      ...commonJSBuild.output,
      dir: 'dist/es',
      format: 'es',
      minifyInternalExports: false,
      sourcemap: false
    },
    plugins: [...nodePlugins, emitModulePackageFile(), collectLicenses(), writeLicense()]
  };

  const { collectLicenses: collectLicensesBrowser, writeLicense: writeLicenseBrowser } =
    getLicenseHandler(fileURLToPath(new URL('browser', import.meta.url)));

  const browserBuilds: RollupOptions = {
    input: 'src/browser-entry.ts',
    onwarn,
    output: [
      {
        banner: getBanner,
        file: 'browser/dist/rollup.browser.js',
        format: 'umd',
        name: 'rollup',
        plugins: [copyTypes('rollup.browser.d.ts')],
        sourcemap: true
      },
      {
        banner: getBanner,
        file: 'browser/dist/es/rollup.browser.js',
        format: 'es',
        plugins: [emitModulePackageFile()]
      }
    ],
    plugins: [
      replaceBrowserModules(),
      alias(moduleAliases),
      nodeResolve({ browser: true }),
      json(),
      commonjs(),
      typescript(),
      terser({ module: true, output: { comments: 'some' } }),
      collectLicensesBrowser(),
      writeLicenseBrowser(),
      cleanBeforeWrite('browser/dist')
    ],
    strictDeprecations: true,
    treeshake
  };

  return [commonJSBuild, esmBuild, browserBuilds];
}
```

请注意上面使用了 addCliEntry 插件。它的代码定义在 build-plugins/add-cli-entry.ts：

```ts
import { chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import MagicString from 'magic-string';
import type { Plugin } from 'rollup';

const CLI_CHUNK = 'bin/rollup';

export default function addCliEntry(): Plugin {
  return {
    buildStart() {
      this.emitFile({
        fileName: CLI_CHUNK,
        id: 'cli/cli.ts',
        preserveSignature: false,
        type: 'chunk'
      });
    },
    name: 'add-cli-entry',
    renderChunk(code, chunkInfo) {
      if (chunkInfo.fileName === CLI_CHUNK) {
        const magicString = new MagicString(code);
        //声明在 shell 中使用 node来运行
        magicString.prepend('#!/usr/bin/env node\n\n');
        return { code: magicString.toString(), map: magicString.generateMap({ hires: true }) };
      }
      return null;
    },
    writeBundle({ dir }) {
      return chmod(resolve(dir!, CLI_CHUNK), '755'); //修改文件可读写权限，保证执行的权限
      /*
			在Node.js中，可以调用fs模块，有一个方法chmod，可以用来修改文件或目录的读写权限。方法chmod有三个参数，文件路径、读写权限和回调函数，其中读写权限是用代号表示的，
			（1）0600：所有者可读写，其他的用户不行
			（2）0644：所有者可读写，其他的用户只读
			（3）0740：所有者可读写，所有者所在的组只读
			（4）0755：所有者可读写，其他用户可读可执行
			*/
    }
  };
}
```

addCliEntry 插件将 /cli/cli.ts 源码添加到输出的 chunk 中，并且在文件的头部增加一行代码：'#!/usr/bin/env node\n\n'。

首先解释一下 #!/usr/bin/env node

- \# 在 shell 脚本中单独使用代表注释
- \#! 组合使用表示要用在 shell 脚本中
- env 是 Mac 或者 Linux 系统的环境变量，是一个可执行命令
- env node ： 指的是使用当前 env 环境内的配置的 Path 路径下的 node 执行
- 当前脚本在执行 shell 时，会自动从 env 内调用合适的解释器执行

这样做的目的是为了能够解析当前脚本文件，该命令会自动从当前 env 环境中查找配置的 node 版本来执行脚本。

最终我们使用 npm run build 的命令打包 rollup 源码的时候就会生成 dist/bin/rollup 这个文件了

```js
#!/usr/bin/env node

/*
  @license
	Rollup.js v3.2.3
	Sat, 28 Jan 2023 07:43:49 GMT - commit 5fa73d941c16a6bcbebaa3ae5bb6aaca8b97d0b7

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
'use strict';

Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: 'Module' } });

const process$1 = require('node:process');
const rollup = require('../shared/rollup.js');
const require$$2 = require('util');
const require$$0 = require('path');
const require$$0$1 = require('fs');
const node_fs = require('node:fs');
const node_path = require('node:path');
const loadConfigFile_js = require('../shared/loadConfigFile.js');
require('node:perf_hooks');
require('node:crypto');
require('node:events');
require('tty');
require('node:url');

# ...
const command = argParser(process$1.argv.slice(2), {
    alias: rollup.commandAliases,
    configuration: { 'camel-case-expansion': false } //为 argParser 解析器提供配置选项, 'camel-case-expansion': false 表示连字符参数不会被扩展为驼峰大小写别名
});
//process.stdin.isTTY 用于检测我们的程序是否直接连到终端
if (command.help || (process$1.argv.length <= 2 && process$1.stdin.isTTY)) {
    console.log(`\n${help.replace('__VERSION__', rollup.version)}\n`);
}
else if (command.version) {
    console.log(`rollup v${rollup.version}`);
}
else {
  try {
      // eslint-disable-next-line unicorn/prefer-module
      //浏览器是支持source maps的，但node环境原生不支持source maps。所以我们可以通过'source-map-support'包来实现这个功能。这样当程序执行出错的时候方便通过控制台定位到源码位置。
      require('source-map-support').install();
  }
  catch {
      // do nothing
  }
  runRollup(command);
}

exports.getConfigPath = getConfigPath;
exports.loadConfigFromCommand = loadConfigFromCommand;
exports.prettyMilliseconds = prettyMilliseconds;
exports.printTimings = printTimings;
//# sourceMappingURL=rollup.map
```
