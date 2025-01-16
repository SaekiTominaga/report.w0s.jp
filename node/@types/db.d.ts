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
		ip: string;
		registeredAt: Date;
	}
}
