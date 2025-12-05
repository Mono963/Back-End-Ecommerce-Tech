import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Put,
  ParseUUIDPipe,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AuthGuard } from 'src/guards/auth.guards';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../users/interface/IUserResponseDto';
import { AddToCartDTO, CartResponseDTO, UpdateCartItemDTO } from './dto/create-cart.dto';

@ApiTags('Cart')
@Controller('cart')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get the authenticated user's shopping cart",
  })
  @ApiResponse({
    status: 200,
    description: 'User shopping cart retrieved successfully',
    type: CartResponseDTO,
  })
  async getMyCart(@Req() req: AuthenticatedRequest): Promise<CartResponseDTO> {
    return await this.cartService.getCart(req.user.sub);
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add a product to the shopping cart',
  })
  @ApiBody({ type: AddToCartDTO })
  @ApiResponse({
    status: 200,
    description: 'Product added to cart successfully',
    type: CartResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - insufficient stock or invalid product',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async addProductToCart(
    @Req() req: AuthenticatedRequest,
    @Body() addToCartDTO: AddToCartDTO,
  ): Promise<CartResponseDTO> {
    return await this.cartService.addProductToCart(req.user.sub, addToCartDTO);
  }

  @Put('items/:cartItemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update the quantity of an item in the cart',
  })
  @ApiParam({
    name: 'cartItemId',
    type: 'string',
    description: 'ID of the cart item to update',
  })
  @ApiBody({ type: UpdateCartItemDTO })
  @ApiResponse({
    status: 200,
    description: 'Cart item quantity updated successfully',
    type: CartResponseDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Cart item not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid quantity or insufficient stock',
  })
  async updateCartItemQuantity(
    @Req() req: AuthenticatedRequest,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
    @Body() updateCartItemDTO: UpdateCartItemDTO,
  ): Promise<CartResponseDTO> {
    return await this.cartService.updateCartItemQuantity(req.user.sub, cartItemId, updateCartItemDTO);
  }

  @Delete('items/:cartItemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove an item from the shopping cart',
  })
  @ApiParam({
    name: 'cartItemId',
    type: 'string',
    description: 'ID of the cart item to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Item removed from cart successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Cart item not found',
  })
  async removeCartItem(@Req() req: AuthenticatedRequest, @Param('cartItemId', ParseUUIDPipe) cartItemId: string) {
    return await this.cartService.removeCartItem(req.user.sub, cartItemId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear all items from the shopping cart',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
  })
  async clearCart(@Req() req: AuthenticatedRequest) {
    return await this.cartService.clearCart(req.user.sub);
  }
}
