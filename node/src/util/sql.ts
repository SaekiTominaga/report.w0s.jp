/**
 * WHERE 句を組み立てる
 *
 * @param data - キーにテーブルのカラム名、値にカラムに格納する値をセットしたオブジェクト
 *
 * @returns WHERE 句の文字列と bind で使用するオブジェクト
 */
export const prepareWhereEqual = (
	data: Readonly<Record<string, string | number | undefined>>,
): { sqlWhere: string; bind: Record<string, string | number | undefined> } => {
	const dataArray = Object.entries(data);

	const sqlWhere = dataArray
		.map(([key, value]) => {
			if (value === undefined) {
				return `${key} IS NULL`;
			}
			return `${key} = :${key}`;
		})
		.join(' AND ');

	const bind = Object.fromEntries(dataArray.filter(([, value]) => value !== undefined).map(([key, value]) => [`:${key}`, value]));

	return {
		sqlWhere: sqlWhere,
		bind: bind,
	};
};
