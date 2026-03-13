import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RefundsService } from './refunds.service';
import { CreateRefundDto, AdminRefundActionDto, RefundResponseDto } from './dto/refund.dto';
import { PaginatedRefundsDto, RefundSearchQueryDto } from './dto/paginate.refund.dto';
import { AuthGuard } from '../../guards/auth.guards';
import { RoleGuard } from '../../guards/auth.guards.role';
import { Roles, UserRole } from '../../decorator/role.decorator';
import { AuthRequest } from '../../common/auths/auth-request.interface';
import { RefundStatus } from './enum/refund.enum';

@ApiTags('Refunds')
@Controller('refunds')
@ApiBearerAuth()
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Submit a refund request' })
  @ApiResponse({ status: 201, description: 'Refund request submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or pending refund exists' })
  @ApiResponse({ status: 403, description: 'Order does not belong to the user' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async createRefundRequest(
    @Body() dto: CreateRefundDto,
    @Req() req: AuthRequest,
  ): Promise<{ message: string; refundId: string }> {
    const userId = req.user.sub;
    return await this.refundsService.createRefundRequest(userId, dto);
  }

  @Get('my-refunds')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  @ApiOperation({ summary: "Get authenticated user's refund requests" })
  @ApiResponse({ status: 200, description: 'User refund requests', type: [RefundResponseDto] })
  async getMyRefunds(@Req() req: AuthRequest): Promise<RefundResponseDto[]> {
    const userId = req.user.sub;
    return await this.refundsService.getUserRefunds(userId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all refund requests (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RefundStatus,
    description: 'Filter by refund status',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter by user ID',
  })
  @ApiResponse({ status: 200, description: 'Paginated refund requests', type: PaginatedRefundsDto })
  async getAllRefunds(@Query() searchQuery: RefundSearchQueryDto): Promise<PaginatedRefundsDto> {
    return await this.refundsService.getAllRefunds(searchQuery);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get refund request by ID (admin)' })
  @ApiResponse({ status: 200, description: 'Refund request details', type: RefundResponseDto })
  @ApiResponse({ status: 404, description: 'Refund request not found' })
  async getRefundById(@Param('id', ParseUUIDPipe) id: string): Promise<RefundResponseDto> {
    return await this.refundsService.getRefundById(id);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Approve a refund request (admin)' })
  @ApiResponse({ status: 200, description: 'Refund request approved', type: RefundResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Refund request not found' })
  async approveRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminRefundActionDto,
  ): Promise<RefundResponseDto> {
    return await this.refundsService.approveRefund(id, dto);
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({ summary: 'Reject a refund request (admin)' })
  @ApiResponse({ status: 200, description: 'Refund request rejected', type: RefundResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Refund request not found' })
  async rejectRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminRefundActionDto,
  ): Promise<RefundResponseDto> {
    return await this.refundsService.rejectRefund(id, dto);
  }
}
