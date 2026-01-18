import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto, WishlistResponseDto, WishlistSummaryDto, WishlistItemResponseDto } from './dto/wishlist.dto';
import { AuthGuard } from 'src/guards/auth.guards';
import { RoleGuard } from 'src/guards/auth.guards.role';
import { Roles, UserRole } from 'src/decorator/role.decorator';
import { AuthenticatedRequest } from '../users/interface/IUserResponseDto';

@ApiTags('Wishlist')
@ApiBearerAuth()
@Controller('wishlist')
@UseGuards(AuthGuard, RoleGuard)
@Roles(UserRole.CLIENT)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get('my-wishlist')
  @ApiOperation({ summary: 'Obtener wishlist del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist obtenida exitosamente',
    type: WishlistResponseDto,
  })
  async getMyWishlist(@Req() req: AuthenticatedRequest): Promise<WishlistResponseDto> {
    return await this.wishlistService.getWishlist(req.user.sub);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Obtener resumen de wishlist (para navbar)' })
  @ApiResponse({
    status: 200,
    description: 'Resumen obtenido exitosamente',
    type: WishlistSummaryDto,
  })
  async getWishlistSummary(@Req() req: AuthenticatedRequest): Promise<WishlistSummaryDto> {
    return await this.wishlistService.getWishlistSummary(req.user.sub);
  }

  @Post('add')
  @ApiOperation({ summary: 'Agregar producto a wishlist' })
  @ApiResponse({
    status: 201,
    description: 'Producto agregado a wishlist exitosamente',
    type: WishlistItemResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Producto no encontrado o no está activo',
  })
  @ApiResponse({
    status: 400,
    description: 'Producto ya está en la wishlist',
  })
  async addToWishlist(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddToWishlistDto,
  ): Promise<WishlistItemResponseDto> {
    return await this.wishlistService.addToWishlist(req.user.sub, dto.productId);
  }

  @Delete('remove/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar producto de wishlist' })
  @ApiParam({
    name: 'productId',
    description: 'ID del producto a eliminar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Producto eliminado de wishlist exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Wishlist o producto no encontrado',
  })
  async removeFromWishlist(@Req() req: AuthenticatedRequest, @Param('productId') productId: string): Promise<void> {
    return await this.wishlistService.removeFromWishlist(req.user.sub, productId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Vaciar wishlist completa' })
  @ApiResponse({
    status: 204,
    description: 'Wishlist vaciada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Wishlist no encontrada',
  })
  async clearWishlist(@Req() req: AuthenticatedRequest): Promise<void> {
    return await this.wishlistService.clearWishlist(req.user.sub);
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Verificar si un producto está en la wishlist' })
  @ApiParam({
    name: 'productId',
    description: 'ID del producto a verificar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Verificación exitosa',
    schema: {
      type: 'object',
      properties: {
        isInWishlist: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  async checkInWishlist(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<{ isInWishlist: boolean }> {
    const isInWishlist = await this.wishlistService.isInWishlist(req.user.sub, productId);
    return { isInWishlist };
  }
}
