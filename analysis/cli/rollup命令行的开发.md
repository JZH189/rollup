# rollup 命令行的开发

Rollup 命令行的源码在项目的根目录的 cli 下：

```JavaScript
cli
├─ run              //定义了runRollup函数，以及加载配置文件等业务代码
├─ cli.ts           //命令行解析入口
├─ help.md          //rollup帮助文档
├─ logging.ts       //handleError方法定义
```

```shell
npm install --global rollup
```

当我们使用 --global 选项的时候会将包安装到 prefix 文件夹而不是当前工作目录中，这样 Rollup 就可以在“全局”模式下运行。

- 软件包安装到 {prefix}/lib/node_modules 文件夹中，而不是当前工作目录中。
- bin 文件链接到 {prefix}/bin
- manpage 链接到 {prefix}/share/man

prefix 默认为 node 的安装位置。在大多数系统上，它是 /usr/local。在 Windows 上，它是 %AppData%npm。在 Unix 系统上，它向上一级，因为 node 通常安装在{prefix}/bin/node 而不是{prefix}/node.exe。

设置全局标志后，npm 会将内容安装到此前缀中。如果未设置，它将使用当前包的根目录，或者当前工作目录（如果尚未在包中）。

以 windows 环境举个例子,我们使用 win+R 输入 cmd 打开终端窗口。然后接着运行 where rollup 就能看到 rollup 安装在哪个目录下。我的是在 C:\Program Files\nodejs\rollup 位置。于是找到该路径下的 rollup 文件打开看看：

```shell
#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\,/,g')") #普通变量无需声明，使用时直接赋值即可

case `uname` in
    *CYGWIN*|*MINGW*|*MSYS*) basedir=`cygpath -w "$basedir"`;;
esac

if [ -x "$basedir/node" ]; then
  exec "$basedir/node"  "$basedir/node_modules/rollup/dist/bin/rollup" "$@"
else
  exec node  "$basedir/node_modules/rollup/dist/bin/rollup" "$@"
fi

```

rollup.cmd

```bash
@ECHO off #通常我们将这条指令写在我们批处理文件的第一行，因为有了这条指令之后，当我们在运行.bat或者.cmd的时候，就不会将文件里面的内容打印出来了，如果没有这句话，会先去将文件里面的内容打印在屏幕上

# echo off 这条指令之后的内容不会被打印，但是这个指令会被打印
# @  某一条指令不想被打印，可以在前面加上@

GOTO start
:find_dp0
SET dp0=%~dp0  # 赋值：set，注意等号左边不能有空格，等号右边的空格会被当做字符串的一部分
EXIT /b
:start
SETLOCAL
CALL :find_dp0

IF EXIST "%dp0%\node.exe" (
  SET "_prog=%dp0%\node.exe"
  SET "_prog=%dp0%\node.exe"
) ELSE (
  SET "_prog=node"
  SET PATHEXT=%PATHEXT:;.JS;=;%
)

endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\node_modules\rollup\dist\bin\rollup" %*

```

上面代码中的变量解释

- $0：如果在命令行下表示用户当前的 shell；脚本内表示执行的脚本名称
- $@：执行脚本时的参数。"$@" 等效于 "$1" "$2" ... "$N"
