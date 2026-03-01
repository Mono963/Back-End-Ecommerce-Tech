import {
  Body,
  Controller,
  Delete,
  Get,
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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guards';
import { RoleGuard } from 'src/guards/auth.guards.role';
import { Roles, UserRole } from 'src/decorator/role.decorator';
import { AuthRequest } from 'src/common/auths/auth-request.interface';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { NewsletterCampaign } from './entities/newsletter-campaign.entity';
import { CampaignStatus, CampaignType } from './interface/newsletter.interface';

@ApiTags('Newsletter Campaigns')
@Controller('newsletter/campaigns')
@UseGuards(AuthGuard, RoleGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @ApiOperation({ summary: 'Create a new newsletter campaign (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Campaign created successfully',
    type: NewsletterCampaign,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid product IDs or validation error',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @Post()
  async create(@Body() dto: CreateCampaignDto, @Req() req: AuthRequest): Promise<NewsletterCampaign> {
    return await this.campaignService.create(dto, req.user.sub);
  }

  @ApiOperation({ summary: 'List all newsletter campaigns with optional filters (Admin only)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'active', 'archived'],
    description: 'Filter by campaign status',
  })
  @ApiQuery({
    name: 'campaignType',
    required: false,
    enum: ['custom', 'monthly', 'promo', 'welcome'],
    description: 'Filter by campaign type',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaigns retrieved successfully',
    type: [NewsletterCampaign],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @Get()
  async findAll(
    @Query('status') status?: CampaignStatus,
    @Query('campaignType') campaignType?: CampaignType,
  ): Promise<NewsletterCampaign[]> {
    return await this.campaignService.findAll({ status, campaignType });
  }

  @ApiOperation({ summary: 'Get a specific newsletter campaign by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Campaign UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign retrieved successfully',
    type: NewsletterCampaign,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Campaign not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<NewsletterCampaign> {
    return await this.campaignService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a newsletter campaign (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Campaign UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign updated successfully',
    type: NewsletterCampaign,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Campaign not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid product IDs or validation error',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCampaignDto): Promise<NewsletterCampaign> {
    return await this.campaignService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a newsletter campaign (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Campaign UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Campaign not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.campaignService.remove(id);
    return { message: 'Campaña eliminada exitosamente.' };
  }

  @ApiOperation({ summary: 'Send a newsletter campaign to all subscribers (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Campaign UUID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign enqueued successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Campaign not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Campaign must be active to send',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @Post(':id/send')
  async send(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string; enqueuedCount: number }> {
    const result = await this.campaignService.sendCampaign(id);
    return {
      message: `Campaña encolada para ${result.enqueuedCount} usuarios.`,
      enqueuedCount: result.enqueuedCount,
    };
  }
}
