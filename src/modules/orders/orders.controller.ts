import { Controller, Get, Post, Put, Param, Query, ParseUUIDPipe, UseGuards, Req, Body } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.role';
import { Roles, UserRole } from '../../decorator/role.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthRequest } from 'src/common/auths/auth-request.interface';
import { OrderStatus, OrderStatusadmin } from './enum/order.enum';
import { PaginatedOrdersDto, ResponseOrderDto } from './dto/order.response.dto';
import { OrderFiltersDto } from './dto/order.filters.dto';
import { OrderStatsDto } from './dto/order.stats.dto';
import { CancelOrderDto, UpdateOrderStatusDto } from './dto/order.actions.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
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
  @ApiOperation({
    summary: 'Get all orders for authenticated user',
    description: 'Returns a list of user orders sorted by date',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders list retrieved',
    type: [ResponseOrderDto],
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async getMyOrders(@Req() req: AuthRequest): Promise<ResponseOrderDto[]> {
    const userId = req.user.sub;
    return await this.ordersService.getUserOrders(userId);
  }

  @Get('stats')
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
  async getOrderStats(): Promise<OrderStatsDto> {
    return await this.ordersService.getOrderStats();
  }

  @Get(':id')
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
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async getOrderById(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest): Promise<ResponseOrderDto> {
    const userId = req.user.sub;
    return await this.ordersService.getOrderById(id, userId);
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update order status',
    description: 'Allows changing the status of an order (Admin only)',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'Order ID',
  })
  @ApiQuery({
    name: 'status',
    required: true,
    enum: OrderStatusadmin,
    description: 'New order status',
  })
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
    @Query('status') status: OrderStatus,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<ResponseOrderDto> {
    return await this.ordersService.updateOrderStatus(id, status, dto);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async cancelOrder(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Req() req: AuthRequest,
    @Body() dto: CancelOrderDto,
  ): Promise<ResponseOrderDto> {
    return await this.ordersService.cancelOrder(
      orderId,
      req.user.sub,
      req.user.role as UserRole,
      dto.cancellationReason,
    );
  }
}
