import { plainToClass } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, ValidateIf, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString() NODE_ENV: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  PORT?: number;

  @IsString() DB_HOST: string;
  @IsString() DB_NAME: string;
  @IsInt()
  @Min(1)
  DB_PORT: number;
  @IsString() DB_USERNAME: string;
  @IsString() DB_PASSWORD: string;

  @IsString() SUPABASE_JWT_SECRET: string;

  @IsString() GOOGLE_CLIENT_ID: string;
  @IsString() GOOGLE_CLIENT_SECRET: string;
  @IsString() GOOGLE_CALLBACK_URL: string;
  @IsString() FRONTEND_URL: string;

  @IsString() CLOUDINARY_CLOUD_NAME: string;
  @IsString() CLOUDINARY_API_KEY: string;
  @IsString() CLOUDINARY_API_SECRET: string;
  @IsOptional()
  @IsString()
  CLOUDINARY_FOLDER?: string;

  @IsString() EMAIL_HOST: string;
  @IsInt()
  @Min(1)
  EMAIL_PORT: number;
  @IsString() EMAIL_USER: string;
  @IsString() EMAIL_PASS: string;
  @IsString() EMAIL_FROM: string;
  @IsString() EMAIL_FROM_NAME: string;

  @IsString() MP_ACCESS_TOKEN: string;
  @IsString() FRONTEND_MP_URL: string;
  @IsString() BACKEND_MP_URL: string;

  @ValidateIf((o: EnvironmentVariables) => o.NODE_ENV === 'production')
  @IsString()
  MP_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  REDIS_PORT?: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsOptional()
  @IsString()
  SUPER_ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  N8N_WEBHOOK_URL?: string;
  @IsOptional()
  @IsInt()
  @Min(1)
  N8N_TIMEOUT?: number;
  @IsOptional()
  @IsString()
  N8N_ENABLED?: string;

  @IsOptional()
  @IsString()
  BACKEND_URL?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
