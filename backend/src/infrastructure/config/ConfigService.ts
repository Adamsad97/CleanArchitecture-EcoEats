import "dotenv/config";

export class ConfigService {
  static get(key: string, defaultValue?: string): string {
    const value = process.env[key] || defaultValue;
    if (value === undefined) {
      throw new Error(`Configuration manquante : ${key}`);
    }
    return value;
  }

  static getNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) return defaultValue;
      throw new Error(`Configuration manquante : ${key}`);
    }
    return Number(value);
  }

  // --- Constantes Domaine ---
  static readonly SERVICE_FEE_RATE      = 0.05;
  static readonly DRIVER_BASE_FEE_EUROS = 1.5;
  static readonly DRIVER_PRICE_PER_KM   = 0.5;
  static readonly ESTIMATED_PREP_TIME   = 45;

  // --- Infrastructure ---
  static get databaseUrl() { return this.get("DATABASE_URL"); }
  static get port()        { return this.getNumber("PORT", 3001); }
  static get corsOrigin()  { return this.get("CORS_ORIGIN", "*"); }
}
