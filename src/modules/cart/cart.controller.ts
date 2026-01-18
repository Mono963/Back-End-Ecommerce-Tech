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
import { AddToCartDTO, UpdateCartItemDTO } from './dto/create-cart.dto';
import { ICartResponseDTO, IResponseCartSummaryDTO, IStockValidationResult } from './interfaces/interface.cart';
import { IShippingAddressDto } from '../orders/interfaces/orders.interface';
import { ResponseOrderDto } from '../orders/Dto/order.Dto';
import { SelectAddressDto } from './dto/select-address.dto';
import { RoleGuard } from 'src/guards/auth.guards.role';
import { Roles, UserRole } from 'src/decorator/role.decorator';

@ApiTags('Cart')
@Controller('cart')
@ApiBearerAuth()
@UseGuards(AuthGuard, RoleGuard)
@Roles(UserRole.CLIENT)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('id')
  @ApiOperation({
    summary: "Get the authenticated user's shopping cart with all details",
  })
  @ApiResponse({
    status: 200,
    description: 'User shopping cart retrieved successfully',
    type: ICartResponseDTO,
  })
  async getMyCart(@Req() req: AuthenticatedRequest): Promise<ICartResponseDTO> {
    return await this.cartService.getCartById(req.user.sub);
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get cart summary (count and total only) - optimized for navbar',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        itemCount: { type: 'number', example: 3 },
        total: { type: 'number', example: 299.99 },
        hasItems: { type: 'boolean', example: true },
      },
    },
  })
  async getCartSummary(@Req() req: AuthenticatedRequest): Promise<IResponseCartSummaryDTO> {
    return await this.cartService.getCartSummary(req.user.sub);
  }

  @Post('add')
  @ApiOperation({
    summary: 'Add a product to the shopping cart',
  })
  @ApiBody({ type: AddToCartDTO })
  @ApiResponse({
    status: 200,
    description: 'Product added to cart successfully',
    type: ICartResponseDTO,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - insufficient stock, invalid product, or product not available',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
  })
  async addProductToCart(
    @Req() req: AuthenticatedRequest,
    @Body() addToCartDTO: AddToCartDTO,
  ): Promise<ICartResponseDTO> {
    return await this.cartService.addProductToCart(req.user.sub, addToCartDTO);
  }

  @Put('items/:cartItemId')
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
    type: ICartResponseDTO,
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
  ): Promise<ICartResponseDTO> {
    return await this.cartService.updateCartItemQuantity(req.user.sub, cartItemId, updateCartItemDTO);
  }

  @Delete('items/:cartItemId')
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
  async removeCartItem(
    @Req() req: AuthenticatedRequest,
    @Param('cartItemId', ParseUUIDPipe) cartItemId: string,
  ): Promise<{ message: string; cart: ICartResponseDTO }> {
    return await this.cartService.removeCartItem(req.user.sub, cartItemId);
  }

  @Delete('clear')
  @ApiOperation({
    summary: 'Clear all items from the shopping cart',
  })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
  })
  async clearCart(@Req() req: AuthenticatedRequest): Promise<{ message: string }> {
    return await this.cartService.clearCart(req.user.sub);
  }

  @Post('validate-stock')
  @ApiOperation({
    summary: 'Validate stock availability for all cart items before checkout',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock validation completed',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string' },
              productId: { type: 'string' },
              productName: { type: 'string' },
              issue: { type: 'string' },
              requested: { type: 'number' },
              available: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async validateStock(@Req() req: AuthenticatedRequest): Promise<IStockValidationResult> {
    return await this.cartService.validateCartStock(req.user.sub);
  }

  @Post('select-address')
  @ApiOperation({
    summary: 'Select a saved address from user profile for checkout',
    description: 'Validates that the address exists in user.addresses before selecting it',
  })
  @ApiBody({ type: SelectAddressDto })
  @ApiResponse({
    status: 200,
    description: 'Address selected successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Dirección seleccionada exitosamente para el checkout' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Address not found in user saved addresses',
  })
  @ApiResponse({
    status: 404,
    description: 'Cart not found',
  })
  async selectAddress(@Req() req: AuthenticatedRequest, @Body() dto: SelectAddressDto): Promise<{ message: string }> {
    return await this.cartService.selectAddressForCheckout(req.user.sub, dto.addressId);
  }

  @Get('selected-address')
  @ApiOperation({
    summary: 'Get the currently selected address ID for checkout',
    description: 'Returns the addressId selected for the cart, or null if none selected',
  })
  @ApiResponse({
    status: 200,
    description: 'Selected address ID retrieved',
    schema: {
      type: 'object',
      properties: {
        selectedAddressId: { type: 'string', nullable: true, example: '550e8400-e29b-41d4-a716-446655440000' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Cart not found',
  })
  async getSelectedAddress(@Req() req: AuthenticatedRequest): Promise<{ selectedAddressId: string | null }> {
    return await this.cartService.getSelectedAddress(req.user.sub);
  }

  @Post('checkout')
  @ApiOperation({
    summary: 'Create order from cart items',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        shippingAddress: {
          type: 'object',
          properties: {
            street: { type: 'string', example: 'Av. Pellegrini' },
            number: { type: 'string', example: '1234' },
            city: { type: 'string', example: 'Rosario' },
            state: { type: 'string', example: 'Santa Fe' },
            zipCode: { type: 'string', example: '2000' },
            country: { type: 'string', example: 'Argentina' },
          },
          required: ['street', 'number', 'city', 'state', 'zipCode'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully from cart',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - empty cart or stock issues',
  })
  async createOrder(
    @Req() req: AuthenticatedRequest,
    @Body() body: { shippingAddress: IShippingAddressDto },
  ): Promise<ResponseOrderDto> {
    return await this.cartService.createOrderFromCartCheckout(req.user.sub, body.shippingAddress);
  }
}
