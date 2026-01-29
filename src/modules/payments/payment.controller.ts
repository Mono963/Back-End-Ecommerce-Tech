import { Controller, Post, Body, Param, ParseUUIDPipe, Get, Logger, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreatePreferenceDto,
  IPaymentCompletedDto,
  PaymentStatusDto,
  PreferenceResponseDto,
  WebhookNotificationDto,
} from '../payments/dto/create-payment.dto';
import { AuthGuard } from 'src/guards/auth.guards';

import { Roles, UserRole } from 'src/decorator/role.decorator';
import { RoleGuard } from '../../guards/auth.guards.role';
import { PaymentsService } from './payment.service';
import { IWebhookNotificationInterface } from './interface/patment.interface';
import { isWebhookNotification } from './validate/payment.validate';

@ApiTags('Order-payments')
@Controller('order-payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly PaymentsService: PaymentsService) {}

  @Post('create-preference/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment preference for cart purchase' })
  @ApiParam({
    name: 'userId',
    type: String,
    description: 'ID of the user making the purchase',
  })
  @ApiBody({ type: CreatePreferenceDto })
  @ApiResponse({
    status: 201,
    description: 'Payment preference successfully created',
    type: PreferenceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data, user not found, or cart not found',
  })
  @UseGuards(AuthGuard)
  async createPreference(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() createPreferenceDto: CreatePreferenceDto,
  ): Promise<PreferenceResponseDto> {
    return await this.PaymentsService.createPreferencePayment(userId, createPreferenceDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Todos los' })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved successfully',
    type: IPaymentCompletedDto,
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async getAllPaymentStatus(): Promise<IPaymentCompletedDto[]> {
    return await this.PaymentsService.getAllOrdersPayment();
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Unified webhook for all payment types (donations and orders)',
  })
  @ApiBody({ type: WebhookNotificationDto })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  async handleWebhook(@Body() notification: IWebhookNotificationInterface): Promise<{ status: string }> {
    if (!isWebhookNotification(notification)) {
      this.logger.warn('Invalid webhook notification structure received');
      return { status: 'invalid_structure' };
    }

    try {
      await this.PaymentsService.handleWebhook(notification);
      return { status: 'success' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Webhook processing error: ${message}`);
      return { status: 'error' };
    }
  }

  @Get('status/:paymentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check payment status by payment ID' })
  @ApiParam({
    name: 'paymentId',
    type: String,
    description: 'Payment ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved successfully',
    type: PaymentStatusDto,
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async getPaymentStatus(@Param('paymentId') paymentId: string): Promise<PaymentStatusDto> {
    return await this.PaymentsService.getPaymentStatus(paymentId);
  }

  @Get('order/:orderId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment information by order ID' })
  @ApiParam({
    name: 'orderId',
    type: String,
    description: 'Order ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment information retrieved successfully',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async getPaymentByCartId(@Param('cartId', ParseUUIDPipe) cartId: string): Promise<any> {
    await this.PaymentsService.getPaymentByOrderId(cartId);
  }

  @Get('user/:userId/payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments for a user' })
  @ApiParam({
    name: 'userId',
    type: String,
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User payments retrieved successfully',
  })
  @UseGuards(AuthGuard)
  async getUserPayments(@Param('userId', ParseUUIDPipe) userId: string): Promise<any[]> {
    await this.PaymentsService.getPaymentsByUserId(userId);
  }
}
