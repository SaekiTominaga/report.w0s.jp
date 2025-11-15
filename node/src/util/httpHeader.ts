/**
 * `Content-Security-Policy`, `Content-Security-Policy-Report-Only`
 *
 * @param object -
 *
 * @returns ヘッダー値
 */
export const csp = (object: Readonly<Record<string, readonly string[]>>): string =>
	Object.entries(object)
		.map(([key, values]) => `${key} ${values.join(' ')}`)
		.join(';');

/**
 * `Reporting-Endpoints`
 *
 * @param object -
 *
 * @returns ヘッダー値
 */
export const reportingEndpoints = (object: Readonly<Record<string, string>>): string =>
	Object.entries(object)
		.map(([key, value]) => `${key}="${value}"`)
		.join(',');
