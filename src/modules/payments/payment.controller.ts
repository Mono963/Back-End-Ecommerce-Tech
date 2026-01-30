import {
  Controller,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Get,
  Logger,
  UseGuards,
  HttpCode,
  Req,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreatePreferenceDto,
  IPaymentCompletedDto,
  MyPaymentResponseDto,
  PaymentResponseDto,
  PaymentStatusDto,
  PreferenceResponseDto,
  WebhookNotificationDto,
} from '../payments/dto/create-payment.dto';
import { AuthGuard } from 'src/guards/auth.guards';

import { Roles, UserRole } from 'src/decorator/role.decorator';
import { RoleGuard } from '../../guards/auth.guards.role';
import { PaymentsService } from './payment.service';
import { IWebhookNotificationInterface } from './interface/payment.interface';
import { isWebhookNotification } from './validate/payment.validate';
import { AuthenticatedRequest } from '../users/interface/IUserResponseDto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly PaymentsService: PaymentsService) {}

  @Post('create-preference')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment preference' })
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
    @Req() req: AuthenticatedRequest,
    @Body() createPreferenceDto: CreatePreferenceDto,
  ): Promise<PreferenceResponseDto> {
    return await this.PaymentsService.createPreferencePayment(req.user.sub, createPreferenceDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get All payments' })
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
  async handleWebhook(
    @Body() body: Record<string, unknown>,
    @Query('data.id') queryDataId?: string,
    @Query('type') queryType?: string,
    @Query('id') queryId?: string,
  ): Promise<{ status: string }> {
    // MercadoPago puede enviar datos en body o en query params
    // El ID puede venir en diferentes lugares según el tipo de notificación
    const bodyData = body?.data as { id?: string } | undefined;
    const resourceId = bodyData?.id || (body?.id as string) || queryDataId || queryId || '';

    // Construir notificación unificada
    const notification: IWebhookNotificationInterface = {
      type: (body?.type as string) || queryType || '',
      data: {
        id: resourceId,
      },
    };

    this.logger.log(`Webhook received - type: ${notification.type}, data.id: ${notification.data?.id}`);

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

  @Get('my-payments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payments for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'User payments retrieved successfully',
    type: [PaymentResponseDto],
  })
  @UseGuards(AuthGuard)
  async getMyPayments(@Req() req: AuthenticatedRequest): Promise<MyPaymentResponseDto[]> {
    return await this.PaymentsService.getPaymentsByUserId(req.user.sub);
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
    type: PaymentResponseDto,
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async getPaymentByOrderId(@Param('orderId', ParseUUIDPipe) orderId: string): Promise<PaymentResponseDto | null> {
    return await this.PaymentsService.getPaymentByOrderId(orderId);
  }
}
