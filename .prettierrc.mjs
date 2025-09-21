/** @type {import("prettier").Config} */
const config = {
	singleQuote: true,

	overrides: [
		{
			files: '*.ejs',
			options: {
				parser: 'html',
			},
		},
	],
};
export default config;
