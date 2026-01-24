import { registerAs } from '@nestjs/config';
import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenvConfig({ path: envFile });

const config = {
  type: 'postgres',
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  autoLoadEntities: true,
  synchronize: true,
  logging: ['error', 'warn', 'info'],
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/migrations/*{.ts,.js}'],
  ssl: { rejectUnauthorized: false },
};

export default registerAs('typeorm', () => config);

export const connectionSource = new DataSource(config as DataSourceOptions);
