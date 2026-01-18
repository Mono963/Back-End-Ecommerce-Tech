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
import { OrderStatus } from './Entities/order.entity';
import {
  OrderFiltersDto,
  OrderStatsDto,
  PaginatedOrdersDto,
  ResponseOrderDto,
  UpdateOrderStatusDto,
} from './Dto/order.Dto';
import { AuthenticatedRequest } from '../users/interface/IUserResponseDto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener todas las órdenes con paginación y filtros',
    description:
      'Retorna todas las órdenes con metadata de paginación, filtros por estado, fecha, número de orden y email del usuario (Solo Admin)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrderStatus,
    description: 'Filtrar por estado',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    description: 'Fecha de inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    description: 'Fecha de fin (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'orderNumber',
    required: false,
    type: 'string',
    description: 'Buscar por número de orden',
    example: 'ORD-2024-01-0001',
  })
  @ApiQuery({
    name: 'userEmail',
    required: false,
    type: 'string',
    description: 'Buscar por email del usuario',
    example: 'juan@example.com',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    description: 'Página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Límite por página',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de órdenes con metadata',
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
    summary: 'Obtener todas las órdenes del usuario autenticado',
    description: 'Retorna un listado de órdenes del usuario ordenadas por fecha',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de órdenes obtenida',
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
    summary: 'Obtener estadísticas de órdenes',
    description: 'Retorna estadísticas generales de las órdenes (Solo Admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas',
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
    summary: 'Obtener una orden por ID',
    description: 'Retorna los detalles completos de una orden específica',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID de la orden',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Orden encontrada',
    type: ResponseOrderDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Orden no encontrada',
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
    summary: 'Actualizar el estado de una orden',
    description: 'Permite cambiar el estado de una orden (Solo Admin)',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'ID de la orden',
  })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente',
    type: ResponseOrderDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Transición de estado inválida',
  })
  @ApiResponse({
    status: 404,
    description: 'Orden no encontrada',
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
    summary: 'Cancelar una orden',
    description: 'Permite cancelar una orden pendiente o pagada',
  })
  @ApiParam({
    name: 'OrderId',
    type: 'string',
    description: 'ID de la orden',
  })
  @ApiParam({
    name: 'UserId',
    type: 'string',
    description: 'ID de Usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Orden cancelada exitosamente',
    type: ResponseOrderDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede cancelar la orden en su estado actual',
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
