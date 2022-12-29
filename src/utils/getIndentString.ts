import type Module from '../Module';

function guessIndentString(code: string): string | null {
	const lines = code.split('\n');
	//匹配缩进的代码行
	const tabbed = lines.filter(line => /^\t+/.test(line));
	//匹配至少重复2次的空格代码行
	const spaced = lines.filter(line => /^ {2,}/.test(line));

	if (tabbed.length === 0 && spaced.length === 0) {
		return null;
	}

	// More lines tabbed than spaced? Assume tabs, and
	// default to tabs in the case of a tie (or nothing
	// to go on)
	if (tabbed.length >= spaced.length) {
		return '\t';
	}

	// Otherwise, we need to guess the multiple
	const min = spaced.reduce((previous, current) => {
		const numberSpaces = /^ +/.exec(current)![0].length;
		return Math.min(numberSpaces, previous);
	}, Infinity);

	return ' '.repeat(min);
}

export default function getIndentString(
	modules: readonly Module[],
	options: { indent: true | string }
): string {
	if (options.indent !== true) return options.indent;
	for (const module of modules) {
		const indent = guessIndentString(module.originalCode);
		if (indent !== null) return indent;
	}

	return '\t';
}
