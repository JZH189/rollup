# rollup 命令行的开发

Rollup 命令行的源码在项目的根目录的 cli 下：

```JavaScript
cli
├─ run              //定义了runRollup函数，以及加载配置文件等业务代码
├─ cli.ts           //命令行解析入口
├─ help.md          //rollup帮助文档
├─ logging.ts       //handleError方法定义
```

当我们使用如下命令行会将 Rollup 安装到全局的 node_modules 目录中。

```shell
npm install --global rollup
```

以 windows 环境举个例子,当我执行完上面的命令之后会在我的电脑本地

```shell
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')")

case `uname` in
    *CYGWIN*|*MINGW*|*MSYS*) basedir=`cygpath -w "$basedir"`;;
esac

if [ -x "$basedir/node" ]; then
  exec "$basedir/node"  "$basedir/node_modules/rollup/dist/bin/rollup" "$@"
else
  exec node  "$basedir/node_modules/rollup/dist/bin/rollup" "$@"
fi

```
