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
  Headers,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination';
import { AuthGuard } from 'src/guards/auth.guards';

import { Roles, UserRole } from 'src/decorator/role.decorator';
import { RoleGuard } from '../../guards/auth.guards.role';
import { PaymentsService } from './payment.service';
import { IWebhookNotificationInterface } from './interface/payment.interface';
import { isWebhookNotification } from './validate/payment.validate';
import { AuthRequest } from 'src/common/auths/auth-request.interface';
import { SkipThrottle } from '@nestjs/throttler';
import { CreatePreferenceDto, PreferenceResponseDto } from './dto/payment.preference.dto';
import { PaymentCompletedDto, PaymentStatusDto } from './dto/payment.status.dto';
import { WebhookNotificationDto } from './dto/payment.webhook.dto';
import { MyPaymentResponseDto, PaymentResponseDto } from './dto/payment.response.dto';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  private readonly webhookSecret: string | undefined;

  constructor(
    private readonly PaymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('MP_WEBHOOK_SECRET');
  }

  private verifyWebhookSignature(
    xSignature: string | undefined,
    xRequestId: string | undefined,
    dataId: string,
  ): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('MP_WEBHOOK_SECRET not configured - skipping webhook signature verification');
      return true;
    }

    if (!xSignature || !xRequestId) {
      return false;
    }

    const parts: Record<string, string> = {};
    for (const part of xSignature.split(',')) {
      const [key, value] = part.split('=', 2);
      if (key && value) {
        parts[key.trim()] = value.trim();
      }
    }

    const ts = parts['ts'];
    const v1 = parts['v1'];

    if (!ts || !v1) {
      return false;
    }

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const hmac = crypto.createHmac('sha256', this.webhookSecret).update(manifest).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
  }

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
    @Req() req: AuthRequest,
    @Body() createPreferenceDto: CreatePreferenceDto,
  ): Promise<PreferenceResponseDto> {
    return await this.PaymentsService.createPreferencePayment(req.user.sub, createPreferenceDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get All payments (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved successfully',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async getAllPaymentStatus(@Query() query: PaginationQueryDto) {
    return await this.PaymentsService.getAllOrdersPayment({ page: query.page, limit: query.limit });
  }

  @Post('webhook')
  @HttpCode(200)
  @SkipThrottle()
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
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
    @Query('data.id') queryDataId?: string,
    @Query('type') queryType?: string,
    @Query('id') queryId?: string,
  ): Promise<{ status: string }> {
    const bodyData = body?.data as { id?: string } | undefined;
    const resourceId = bodyData?.id || (body?.id as string) || queryDataId || queryId || '';

    if (!this.verifyWebhookSignature(xSignature, xRequestId, resourceId)) {
      this.logger.warn('Webhook rejected: invalid or missing signature');
      return { status: 'invalid_signature' };
    }

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
  @ApiOperation({ summary: 'Get all payments for the authenticated user (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'User payments retrieved successfully',
  })
  @UseGuards(AuthGuard)
  async getMyPayments(@Req() req: AuthRequest, @Query() query: PaginationQueryDto) {
    return await this.PaymentsService.getPaymentsByUserId(req.user.sub, { page: query.page, limit: query.limit });
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
