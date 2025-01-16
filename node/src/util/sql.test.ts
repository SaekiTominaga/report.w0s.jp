import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { prepareWhereEqual } from './sql.js';

await test('prepareWhereEqual', () => {
	const { sqlWhere, bind } = prepareWhereEqual({ key1: 'foo', key2: 123, key3: undefined });

	assert.equal(sqlWhere, 'key1 = :key1 AND key2 = :key2 AND key3 IS NULL');
	assert.deepEqual(bind, { ':key1': 'foo', ':key2': 123 });
});
