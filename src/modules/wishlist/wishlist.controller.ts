import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto, WishlistResponseDto, WishlistSummaryDto, WishlistItemResponseDto } from './dto/wishlist.dto';
import { AuthGuard } from 'src/guards/auth.guards';
import { RoleGuard } from 'src/guards/auth.guards.role';
import { Roles, UserRole } from 'src/decorator/role.decorator';
import { AuthRequest } from 'src/common/auths/auth-request.interface';

@ApiTags('Wishlist')
@ApiBearerAuth()
@Controller('wishlist')
@UseGuards(AuthGuard, RoleGuard)
@Roles(UserRole.CLIENT)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get('my-wishlist')
  @ApiOperation({ summary: 'Get authenticated user wishlist' })
  @ApiResponse({
    status: 200,
    description: 'Wishlist retrieved successfully',
    type: WishlistResponseDto,
  })
  async getMyWishlist(@Req() req: AuthRequest): Promise<WishlistResponseDto> {
    return await this.wishlistService.getWishlist(req.user.sub);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get wishlist summary (for navbar)' })
  @ApiResponse({
    status: 200,
    description: 'Summary retrieved successfully',
    type: WishlistSummaryDto,
  })
  async getWishlistSummary(@Req() req: AuthRequest): Promise<WishlistSummaryDto> {
    return await this.wishlistService.getWishlistSummary(req.user.sub);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiResponse({
    status: 201,
    description: 'Product added to wishlist successfully',
    type: WishlistItemResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found or not active',
  })
  @ApiResponse({
    status: 400,
    description: 'Product is already in the wishlist',
  })
  async addToWishlist(@Req() req: AuthRequest, @Body() dto: AddToWishlistDto): Promise<WishlistItemResponseDto> {
    return await this.wishlistService.addToWishlist(req.user.sub, dto.productId);
  }

  @Delete('remove/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiParam({
    name: 'productId',
    description: 'ID of the product to remove',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Product removed from wishlist successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Wishlist or product not found',
  })
  async removeFromWishlist(@Req() req: AuthRequest, @Param('productId') productId: string): Promise<void> {
    return await this.wishlistService.removeFromWishlist(req.user.sub, productId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear entire wishlist' })
  @ApiResponse({
    status: 204,
    description: 'Wishlist cleared successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Wishlist not found',
  })
  async clearWishlist(@Req() req: AuthRequest): Promise<void> {
    return await this.wishlistService.clearWishlist(req.user.sub);
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if a product is in the wishlist' })
  @ApiParam({
    name: 'productId',
    description: 'ID of the product to check',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification successful',
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
    @Req() req: AuthRequest,
    @Param('productId') productId: string,
  ): Promise<{ isInWishlist: boolean }> {
    const isInWishlist = await this.wishlistService.isInWishlist(req.user.sub, productId);
    return { isInWishlist };
  }
}
