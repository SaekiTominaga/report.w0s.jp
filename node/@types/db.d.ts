declare namespace ReportDB {
	interface CSP {
		documentUri: string;
		referrer: string;
		blockedUri: string;
		effectiveDirective: string;
		originalPolicy: string;
		disposition: string;
		statusCode: number;
		sample: string | undefined;
		sourceFile: string | undefined;
		lineNumber: number | undefined;
		columnNumber: number | undefined;
		ua: string | undefined;
		ip: string;
		registeredAt: Date;
	}
}
