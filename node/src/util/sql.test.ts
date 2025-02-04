import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { prepareWhere } from './sql.js';

await test('prepareWhere', () => {
	const { sqlWhere, bindParams } = prepareWhere({ key1: 'foo', key2: 123, key3: undefined });

	assert.equal(sqlWhere, 'key1 = :key1 AND key2 = :key2 AND key3 IS NULL');
	assert.deepEqual(bindParams, { ':key1': 'foo', ':key2': 123 });
});
