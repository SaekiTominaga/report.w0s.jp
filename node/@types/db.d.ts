declare namespace ReportDB {
	interface CSP {
		documentURL: string;
		referrer: string | undefined;
		blockedURL: string | undefined;
		effectiveDirective: string;
		originalPolicy: string;
		sourceFile: string | undefined;
		sample: string | undefined;
		disposition: string;
		statusCode: number;
		lineNumber: number | undefined;
		columnNumber: number | undefined;
		ua: string | undefined;
		registeredAt: Date;
	}

	interface JS {
		documentURL: string;
		message: string;
		jsURL: string;
		lineNumber: number;
		columnNumber: number;
		ua: string | undefined;
		registeredAt: Date;
	}

	interface Referrer {
		documentURL: string;
		referrer: string;
		registeredAt: Date;
	}
}
