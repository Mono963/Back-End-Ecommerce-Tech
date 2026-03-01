import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.role';
import { Roles, UserRole } from '../../decorator/role.decorator';
import { DiscountsService } from './discounts.service';
import { CreateProductDiscountDto, UpdateProductDiscountDto } from './dto/create-product-discount.dto';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './dto/create-promo-code.dto';
import { ApplyPromoCodeDto } from './dto/apply-promo-code.dto';
import {
  ProductDiscountResponseDto,
  PromoCodeResponseDto,
  PromoCodeUsageResponseDto,
  ValidatePromoCodeValidResponseDto,
  ValidatePromoCodeInvalidResponseDto,
  MessageResponseDto,
} from './dto/discount.response.dto';
import { AuthRequest } from '../../common/auths/auth-request.interface';

@ApiTags('Discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post('products')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear descuento automatico para un producto' })
  @ApiResponse({ status: 201, description: 'Descuento creado exitosamente', type: ProductDiscountResponseDto })
  async createProductDiscount(@Body() dto: CreateProductDiscountDto): Promise<ProductDiscountResponseDto> {
    return await this.discountsService.createProductDiscount(dto);
  }

  @Get('products')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar todos los descuentos de producto activos' })
  @ApiResponse({ status: 200, type: [ProductDiscountResponseDto] })
  async getProductDiscounts(): Promise<ProductDiscountResponseDto[]> {
    return await this.discountsService.getProductDiscounts();
  }

  @Get('products/:productId')
  @ApiOperation({ summary: 'Ver descuento activo de un producto' })
  @ApiResponse({ status: 200, type: ProductDiscountResponseDto })
  async getProductDiscount(
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<ProductDiscountResponseDto | null> {
    return await this.discountsService.getProductDiscountByProductId(productId);
  }

  @Put('products/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar descuento de producto' })
  @ApiResponse({ status: 200, type: ProductDiscountResponseDto })
  async updateProductDiscount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDiscountDto,
  ): Promise<ProductDiscountResponseDto> {
    return await this.discountsService.updateProductDiscount(id, dto);
  }

  @Delete('products/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar descuento de producto' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async deleteProductDiscount(@Param('id', ParseUUIDPipe) id: string): Promise<MessageResponseDto> {
    return await this.discountsService.deleteProductDiscount(id);
  }

  @Post('promo-codes')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear codigo promocional' })
  @ApiResponse({ status: 201, description: 'Codigo creado exitosamente', type: PromoCodeResponseDto })
  async createPromoCode(@Body() dto: CreatePromoCodeDto): Promise<PromoCodeResponseDto> {
    return await this.discountsService.createPromoCode(dto);
  }

  @Get('promo-codes')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar todos los codigos promocionales' })
  @ApiResponse({ status: 200, type: [PromoCodeResponseDto] })
  async getPromoCodes(): Promise<PromoCodeResponseDto[]> {
    return await this.discountsService.getPromoCodes();
  }

  @Get('promo-codes/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver detalle de codigo promocional' })
  @ApiResponse({ status: 200, type: PromoCodeResponseDto })
  async getPromoCode(@Param('id', ParseUUIDPipe) id: string): Promise<PromoCodeResponseDto> {
    return await this.discountsService.getPromoCodeById(id);
  }

  @Put('promo-codes/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar codigo promocional' })
  @ApiResponse({ status: 200, type: PromoCodeResponseDto })
  async updatePromoCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromoCodeDto,
  ): Promise<PromoCodeResponseDto> {
    return await this.discountsService.updatePromoCode(id, dto);
  }

  @Delete('promo-codes/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar codigo promocional' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async deletePromoCode(@Param('id', ParseUUIDPipe) id: string): Promise<MessageResponseDto> {
    return await this.discountsService.deletePromoCode(id);
  }

  @Get('promo-codes/:id/usage')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver historial de uso de un codigo promocional' })
  @ApiResponse({ status: 200, type: [PromoCodeUsageResponseDto] })
  async getPromoCodeUsage(@Param('id', ParseUUIDPipe) id: string): Promise<PromoCodeUsageResponseDto[]> {
    return await this.discountsService.getPromoCodeUsage(id);
  }

  // ==========================================
  // PUBLIC / AUTHENTICATED
  // ==========================================

  @Post('validate-code')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Validar codigo promocional (preview sin aplicar)' })
  @ApiResponse({ status: 200, description: 'Resultado de la validacion' })
  async validatePromoCode(
    @Body() dto: ApplyPromoCodeDto,
    @Req() req: AuthRequest,
  ): Promise<ValidatePromoCodeValidResponseDto | ValidatePromoCodeInvalidResponseDto> {
    const result = await this.discountsService.validatePromoCodeForUserCart(dto.code, req.user.sub);

    if (!result.valid || !result.promoCode) {
      return {
        valid: false as const,
        errors: result.errors ?? [],
      };
    }

    const { promoCode } = result;

    return {
      valid: true as const,
      code: promoCode.code,
      discountType: promoCode.discountType,
      value: Number(promoCode.value),
      description: promoCode.description ?? null,
    };
  }
}
