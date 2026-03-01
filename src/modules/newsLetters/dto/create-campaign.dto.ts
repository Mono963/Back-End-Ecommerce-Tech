import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  IsEnum,
  IsDateString,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { CampaignStatus, CampaignType } from '../interface/newsletter.interface';

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Internal campaign name for admin reference',
    example: 'Campaña Verano 2025',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Email subject line',
    example: '🔥 👩‍💻 👩‍💻 Ofertas de Fin de Semana',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  subject: string;

  @ApiProperty({
    description: 'Main email title/headline',
    example: '¡Solo este finde!',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Email body content',
    example: 'Aprovechá descuentos de hasta 40% en productos seleccionados.',
  })
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiPropertyOptional({
    description: 'Optional discount code',
    example: 'FINDE40',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  discountCode?: string;

  @ApiPropertyOptional({
    description: 'Array of product UUIDs to feature (max 10)',
    type: [String],
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(10)
  featuredProductIds?: string[];

  @ApiProperty({
    description: 'Call-to-action button text',
    example: 'Ver Ofertas',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  ctaText: string;

  @ApiProperty({
    description: 'Call-to-action button URL (relative path)',
    example: '/productos?category=ofertas',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  ctaUrl: string;

  @ApiPropertyOptional({
    description: 'Campaign status',
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
  })
  @IsOptional()
  @IsEnum(['draft', 'active', 'archived'])
  status?: CampaignStatus;

  @ApiPropertyOptional({
    description: 'Campaign type',
    enum: ['custom', 'monthly'],
    default: 'custom',
  })
  @IsOptional()
  @IsEnum(['custom', 'monthly', 'promo', 'welcome'])
  campaignType?: CampaignType;

  @ApiPropertyOptional({
    description: 'Schedule campaign for future sending (ISO date string)',
    example: '2025-12-31T09:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}
