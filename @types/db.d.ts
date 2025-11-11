import type { Generated } from 'kysely';

type TypeTransform<T> = T extends boolean ? 0 | 1 : T extends Date ? number : T extends URL ? string : T;
type NullTransform<T> = Exclude<T, undefined> | (undefined extends T ? null : never);
type Transform<T> = TypeTransform<NullTransform<T>>;

export interface DCsp {
	document_url: string;
	referrer: string | undefined;
	blocked_url: string | undefined;
	effective_directive: string;
	original_policy: string;
	source_file: string | undefined;
	sample: string | undefined;
	disposition: string | undefined;
	status_code: number | undefined;
	line_number: number | undefined;
	column_number: number | undefined;
	ua: string | undefined;
	registered_at: Date;
}

export interface DJs {
	document_url: string;
	message: string;
	js_url: string;
	line_number: number;
	column_number: number;
	ua: string | undefined;
	registered_at: Date;
}

export interface DReferrer {
	document_url: string;
	referrer: string;
	registered_at: Date;
}

export interface DB {
	d_csp: { [K in keyof DCsp]: Transform<DCsp[K]> };
	d_js: { [K in keyof DJs]: Transform<DJs[K]> };
	d_referrer: { [K in keyof DReferrer]: Transform<DReferrer[K]> };
}
