import type { Bundle as MagicStringBundle } from 'magic-string';
import type { ChunkDependency, ChunkExports, ImportSpecifier, ReexportSpecifier } from '../Chunk';
import type { NormalizedOutputOptions } from '../rollup/types';
import type { GenerateCodeSnippets } from '../utils/generateCodeSnippets';
import { getHelpersBlock } from '../utils/interopHelpers';
import type { FinaliserOptions } from './index';

export default function es(
	magicString: MagicStringBundle,
	{ accessedGlobals, indent: t, intro, outro, dependencies, exports, snippets }: FinaliserOptions,
	{ externalLiveBindings, freeze, namespaceToStringTag }: NormalizedOutputOptions
): void {
	const { n } = snippets;
	//import 语句组成的数组：例如 ["'import { a as acorn } from './acorn-!~{001}~.js':"]
	const importBlock = getImportBlock(dependencies, snippets);
	if (importBlock.length > 0) intro += importBlock.join(n) + n + n;
	intro += getHelpersBlock(
		null,
		accessedGlobals,
		t,
		snippets,
		externalLiveBindings,
		freeze,
		namespaceToStringTag
	);
	if (intro) magicString.prepend(intro); //将 intro 的内容加在 magicString 前面。
	// export 语句组成的数组：例如：['export { hello as default };']
	const exportBlock = getExportBlock(exports, snippets);
	if (exportBlock.length > 0) magicString.append(n + n + exportBlock.join(n).trim());
	// 如果有尾部注释则添加尾部的注释
	if (outro) magicString.append(outro);

	magicString.trim();
}

function getImportBlock(dependencies: ChunkDependency[], { _ }: GenerateCodeSnippets): string[] {
	const importBlock: string[] = [];
	for (const { importPath, reexports, imports, name, assertions } of dependencies) {
		const assertion = assertions ? `${_}assert${_}${assertions}` : '';
		const pathWithAssertion = `'${importPath}'${assertion};`;
		if (!reexports && !imports) {
			importBlock.push(`import${_}${pathWithAssertion}`);
			continue;
		}
		if (imports) {
			let defaultImport: ImportSpecifier | null = null;
			let starImport: ImportSpecifier | null = null;
			const importedNames: ImportSpecifier[] = [];
			for (const specifier of imports) {
				if (specifier.imported === 'default') {
					defaultImport = specifier;
				} else if (specifier.imported === '*') {
					starImport = specifier;
				} else {
					importedNames.push(specifier);
				}
			}
			if (starImport) {
				importBlock.push(`import${_}*${_}as ${starImport.local} from${_}${pathWithAssertion}`);
			}
			if (defaultImport && importedNames.length === 0) {
				importBlock.push(`import ${defaultImport.local} from${_}${pathWithAssertion}`);
			} else if (importedNames.length > 0) {
				importBlock.push(
					`import ${defaultImport ? `${defaultImport.local},${_}` : ''}{${_}${importedNames
						.map(specifier => {
							return specifier.imported === specifier.local
								? specifier.imported
								: `${specifier.imported} as ${specifier.local}`;
						})
						.join(`,${_}`)}${_}}${_}from${_}${pathWithAssertion}`
				);
			}
		}
		if (reexports) {
			let starExport: ReexportSpecifier | null = null;
			const namespaceReexports: ReexportSpecifier[] = [];
			const namedReexports: ReexportSpecifier[] = [];
			for (const specifier of reexports) {
				if (specifier.reexported === '*') {
					starExport = specifier;
				} else if (specifier.imported === '*') {
					namespaceReexports.push(specifier);
				} else {
					namedReexports.push(specifier);
				}
			}
			if (starExport) {
				importBlock.push(`export${_}*${_}from${_}${pathWithAssertion}`);
			}
			if (namespaceReexports.length > 0) {
				if (
					!imports ||
					!imports.some(specifier => specifier.imported === '*' && specifier.local === name)
				) {
					importBlock.push(`import${_}*${_}as ${name} from${_}${pathWithAssertion}`);
				}
				for (const specifier of namespaceReexports) {
					importBlock.push(
						`export${_}{${_}${
							name === specifier.reexported ? name : `${name} as ${specifier.reexported}`
						} };`
					);
				}
			}
			if (namedReexports.length > 0) {
				importBlock.push(
					`export${_}{${_}${namedReexports
						.map(specifier => {
							return specifier.imported === specifier.reexported
								? specifier.imported
								: `${specifier.imported} as ${specifier.reexported}`;
						})
						.join(`,${_}`)}${_}}${_}from${_}${pathWithAssertion}`
				);
			}
		}
	}
	return importBlock;
}

function getExportBlock(exports: ChunkExports, { _, cnst }: GenerateCodeSnippets): string[] {
	const exportBlock: string[] = [];
	const exportDeclaration: string[] = [];
	for (const specifier of exports) {
		if (specifier.expression) {
			exportBlock.push(`${cnst} ${specifier.local}${_}=${_}${specifier.expression};`);
		}
		exportDeclaration.push(
			specifier.exported === specifier.local
				? specifier.local
				: `${specifier.local} as ${specifier.exported}`
		);
	}
	if (exportDeclaration.length > 0) {
		exportBlock.push(`export${_}{${_}${exportDeclaration.join(`,${_}`)}${_}};`);
	}
	return exportBlock;
}
