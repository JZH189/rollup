const { rollup } = require('../dist/rollup');

const outputOption = {
	format: 'es',
	file: 'example/es.js'
};

async function build() {
	try {
		const { write } = await rollup({ input: `${__dirname}/index.js` });
		await write(outputOption);
	} catch (error) {
		console.log('error: ', error);
	}
}

build();
