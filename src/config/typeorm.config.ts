import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenvConfig({ path: envFile });

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  type: 'postgres',
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  autoLoadEntities: true,
  synchronize: false,
  logging: isProduction ? ['error'] : ['error', 'warn', 'info'],
  ssl: isProduction ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
  extra: {
    max: isProduction ? 20 : 10,
    min: isProduction ? 5 : 2,
    idleTimeoutMillis: 30000,
  },
};

export default registerAs('typeorm', () => config);

export const connectionSource = new DataSource({
  ...config,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
} as DataSourceOptions);
