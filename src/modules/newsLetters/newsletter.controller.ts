import {
  Body,
  Controller,
  Get,
  Header,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { NewsletterService } from './newsletter.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guards';
import { Roles, UserRole } from 'src/decorator/role.decorator';
import { SendPromoDto } from './dto/send-promo-dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { RoleGuard } from '../../guards/auth.guards.role';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Newsletter')
@Controller('newsletter')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @ApiOperation({ summary: 'Subscribe to newsletter' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Successfully subscribed to newsletter',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Email already subscribed',
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('subscribe')
  async subscribe(@Body() body: SubscribeDto): Promise<{ message: string }> {
    return await this.newsletterService.subscribe(body.email, body.name);
  }

  @ApiOperation({ summary: 'Unsubscribe from newsletter using token' })
  @ApiQuery({ name: 'token', required: true, description: 'Unsubscribe token from email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully unsubscribed from newsletter',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invalid or expired token',
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Get('unsubscribe')
  async unsubscribe(
    @Query('token') token: string,
  ): Promise<{ message: string; email: string; alreadyUnsubscribed: boolean }> {
    return await this.newsletterService.unsubscribe(token);
  }

  @ApiOperation({ summary: 'Track newsletter email open (pixel)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Returns 1x1 transparent GIF' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Header('Content-Type', 'image/gif')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  @Get('track/open/:trackingId')
  async trackOpen(@Param('trackingId') trackingId: string, @Res() res: Response): Promise<void> {
    await this.newsletterService.trackOpen(trackingId);
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.end(pixel);
  }

  @ApiOperation({ summary: 'Track newsletter link click and redirect' })
  @ApiResponse({ status: HttpStatus.FOUND, description: 'Redirects to original URL' })
  @ApiQuery({ name: 'url', required: false, description: 'Original destination URL' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('track/click/:trackingId')
  async trackClick(
    @Param('trackingId') trackingId: string,
    @Query('url') url: string,
    @Res() res: Response,
  ): Promise<void> {
    const { redirectUrl } = await this.newsletterService.trackClick(trackingId, url);
    res.redirect(302, redirectUrl);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @ApiOperation({ summary: 'Manually trigger monthly newsletter (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Monthly newsletter enqueued successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Post('send-monthly-manual')
  async sendMonthlyManual(): Promise<{ message: string }> {
    await this.newsletterService.handleMonthlyNewsletter();
    return { message: 'Newsletter mensual iniciado manualmente.' };
  }

  @ApiOperation({ summary: 'Send promotional newsletter to all subscribers (Admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Promo newsletter enqueued successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Post('send-promo')
  async sendPromo(@Body() body: SendPromoDto): Promise<{ message: string; enqueuedCount: number }> {
    const result = await this.newsletterService.sendPromoNewsletter(body.title, body.description, body.discountCode);
    return {
      message: `Newsletter promocional encolado para ${result.enqueuedCount} usuarios.`,
      enqueuedCount: result.enqueuedCount,
    };
  }

  @ApiOperation({ summary: 'Get newsletter tracking statistics (Admin only)' })
  @ApiQuery({ name: 'campaignType', required: false, enum: ['welcome', 'monthly', 'promo'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Newsletter statistics retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get('stats')
  async getStats(@Query('campaignType') campaignType?: 'welcome' | 'monthly' | 'promo'): Promise<{
    total: number;
    sent: number;
    failed: number;
    opened: number;
    clicked: number;
  }> {
    return await this.newsletterService.getTrackingStats(campaignType);
  }
}
