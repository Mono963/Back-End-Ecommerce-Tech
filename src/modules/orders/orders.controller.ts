import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  BadRequestException,
  ParseUUIDPipe,
  UseGuards,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.role';
import { Roles, UserRole } from '../../decorator/role.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { OrderStatus } from './entities/order.entity';
import {
  OrderFiltersDto,
  OrderStatsDto,
  PaginatedOrdersDto,
  ResponseOrderDto,
  UpdateOrderStatusDto,
} from './dto/order.Dto';
import { AuthenticatedRequest } from '../users/interface/IUserResponseDto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all orders with pagination and filters',
    description:
      'Returns all orders with pagination metadata, filters by status, date, order number and user email (Admin only)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrderStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'orderNumber',
    required: false,
    type: 'string',
    description: 'Search by order number',
    example: 'ORD-2024-01-0001',
  })
  @ApiQuery({
    name: 'userEmail',
    required: false,
    type: 'string',
    description: 'Search by user email',
    example: 'john@example.com',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    description: 'Page',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Limit per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of orders with metadata',
    type: PaginatedOrdersDto,
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async getAllOrders(@Query() filters: OrderFiltersDto): Promise<PaginatedOrdersDto> {
    return await this.ordersService.getAllOrders(filters);
  }

  @Get('my-orders')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all orders for authenticated user',
    description: 'Returns a list of user orders sorted by date',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders list retrieved',
    type: [ResponseOrderDto],
  })
  @UseGuards(AuthGuard)
  async getMyOrders(@Req() req: AuthenticatedRequest): Promise<ResponseOrderDto[]> {
    const userId = req.user.sub;
    return await this.ordersService.getUserOrders(userId);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get order statistics',
    description: 'Returns general order statistics (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved',
    type: OrderStatsDto,
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async getOrderStats(): Promise<Record<string, unknown>> {
    return await this.ordersService.getOrderStats();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Returns complete details of a specific order',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Order found',
    type: ResponseOrderDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @UseGuards(AuthGuard)
  async getOrderById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ResponseOrderDto> {
    const userId = req.user.sub;
    return await this.ordersService.getOrder(id, userId);
  }

  @Put(':id/status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update order status',
    description: 'Allows changing the status of an order (Admin only)',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Order ID',
  })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    type: ResponseOrderDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<ResponseOrderDto> {
    return await this.ordersService.updateOrderStatus(id, dto.status, dto.paymentMethod);
  }

  @Post(':OrderId/:UserId/cancel')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel an order',
    description: 'Allows canceling a pending or paid order',
  })
  @ApiParam({
    name: 'OrderId',
    type: 'string',
    description: 'Order ID',
  })
  @ApiParam({
    name: 'UserId',
    type: 'string',
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
    type: ResponseOrderDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel order in its current status',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async cancelOrder(
    @Param('OrderId', ParseUUIDPipe) orderId: string,
    @Param('UserId', ParseUUIDPipe) userId: string,
  ): Promise<ResponseOrderDto> {
    const order = await this.ordersService.getOrder(orderId, userId);

    if (![OrderStatus.PENDING, OrderStatus.PAID].includes(order.status)) {
      throw new BadRequestException('Solo se pueden cancelar órdenes pendientes o pagadas');
    }

    return await this.ordersService.updateOrderStatus(orderId, OrderStatus.CANCELLED);
  }

  @Post(':id/confirm-payment')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirmar el pago de una orden',
    description: 'Marca una orden como pagada con el método de pago especificado',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID de la orden',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['paymentMethod'],
      properties: {
        paymentMethod: {
          type: 'string',
          enum: ['credit_card', 'debit_card', 'mercadopago', 'paypal', 'cash'],
          example: 'credit_card',
        },
        transactionId: {
          type: 'string',
          example: 'TRX-123456789',
          description: 'ID de la transacción del procesador de pagos',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Pago confirmado exitosamente',
    type: ResponseOrderDto,
  })
  @ApiResponse({
    status: 400,
    description: 'La orden no está en estado pendiente',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async confirmPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { paymentMethod: string; transactionId?: string },
    @Req() req: AuthenticatedRequest,
  ): Promise<ResponseOrderDto> {
    const isAdminUser = req.user && (req.user.role as UserRole) === UserRole.ADMIN;
    const userId = isAdminUser ? undefined : req.user.sub;

    const order = await this.ordersService.getOrder(id, userId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Solo se pueden pagar órdenes pendientes');
    }

    return await this.ordersService.updateOrderStatus(id, OrderStatus.PAID, body.paymentMethod);
  }
}
