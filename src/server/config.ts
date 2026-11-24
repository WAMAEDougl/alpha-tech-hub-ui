/** Reads settings from environment variables (Vercel Project Settings in production, .env.local in development). */
export class ConfigService {
  get<T = string>(key: string, fallback?: T): T | undefined {
    const v = process.env[key];
    return (v === undefined || v === "" ? fallback : v) as T | undefined;
  }
}

export const config = new ConfigService();
