import { z } from 'zod';
import 'dotenv/config';
import { DbDialect } from './models/DatabaseModels.js';

const ConfigSchema = z.object({
    DB_TYPE: z.enum(DbDialect).default(DbDialect.MSSQL),
    DB_SERVER: z.string().default('localhost'),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    DB_NAME: z.string().optional(),
    DB_TRUST_SERVER_CERTIFICATE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
    DB_SQLITE_PATH: z.string().optional(),
    PORT: z.preprocess((val) => parseInt(val as string, 10), z.number()).default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const result = ConfigSchema.safeParse(process.env);

if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
}

export const config = result.data;
export type Config = z.infer<typeof ConfigSchema>;
