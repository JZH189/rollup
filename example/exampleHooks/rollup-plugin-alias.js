function matches(pattern, source) {
	if (pattern instanceof RegExp) {
		return pattern.test(source);
	}
	if (source.length < pattern.length) {
		return false;
	}
	if (source === pattern) {
		return true;
	}
	return source.startsWith(pattern + '/');
}
function alias({ entries }) {
	if (entries.length === 0) {
		return {
			name: 'alias',
			resolveId: () => null
		};
	}
	return {
		name: 'alias',
		async resolveId(source, importer, resolveOptions) {
			if (!importer) {
				return null;
			}
			const matchedEntry = entries.find(entry => matches(entry.source, source));
			if (!matchedEntry) {
				return null;
			}
			const updatedId = source.replace(matchedEntry.source, matchedEntry.replacement);
			// this.resolve方法使用与 Rollup 相同的插件将 ResolvedId 对象中的 id 设置为 updatedId 并返回这个新对象
			const result = await this.resolve(updatedId, importer, resolveOptions);
			/**
      result: {
        assertions: {},
        external: false,
        id: 'c:\\Users\\**\\Desktop\\study\\rollup-master\\rollup\\example\\user.js',
        meta: {},
        moduleSideEffects: true,
        syntheticNamedExports: false
      }
       */
			return result;
		}
	};
}

module.exports = alias;
