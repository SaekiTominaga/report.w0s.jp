declare namespace ReportDb {
	interface Js {
		pageUrl: string;
		message: string;
		jsUrl: string;
		lineno: number;
		colno: number;
		ua: string | undefined;
		ip: string;
		created: Date;
	}
}
