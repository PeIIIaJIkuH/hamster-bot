export declare global {
	namespace NodeJS {
		interface ProcessEnv {
			BOT_API_TOKEN: string;
			WEB_APP_URL: string;
		}
	}
}
