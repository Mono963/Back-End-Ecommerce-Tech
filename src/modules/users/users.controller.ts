import {
  Controller,
  Get,
  Put,
  Query,
  Param,
  Body,
  UseGuards,
  UsePipes,
  ParseUUIDPipe,
  ValidationPipe,
  Req,
  Delete,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthGuard } from 'src/guards/auth.guards';
import { RoleGuard } from 'src/guards/auth.guards.role';
import { Roles, UserRole } from 'src/decorator/role.decorator';
import { PaginatedUsersDto } from './dtos/paginated-users.dto';
import { UserSearchQueryDto } from './dtos/PaginationQueryDto';
import { AuthRequest } from 'src/common/auths/auth-request.interface';
import { UpdateRoleDto, UserResponseDto, UserResponseWithAdminDto } from './dtos/user-response.dto';
import { UserMapper } from './mappers/user.mapper';
import { UpdatePasswordDto } from './dtos/UpdatePasswordDto';
import { UpdateUserDbDto } from './dtos/CreateUserDto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { CreateAddressDto, UpdateAddressDto, UserAddressDto } from './dtos/address.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Retrieve all users (paginated) with optional search filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'username',
    required: false,
    type: String,
    description: 'Username to search for users',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'Email to search for users',
  })
  @ApiResponse({ status: 200, description: 'OK', type: PaginatedUsersDto })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async getUsers(@Query() searchQuery: UserSearchQueryDto): Promise<PaginatedUsersDto> {
    const { items, ...meta } = await this.usersService.getUsers(searchQuery);
    return { ...meta, items: UserMapper.toAdminResponseList(items) as UserResponseWithAdminDto[] };
  }

  @Patch('password')
  @ApiOperation({ summary: 'Update password' })
  @UseGuards(AuthGuard)
  async changeOwnPassword(@Req() req: AuthRequest, @Body() dto: UpdatePasswordDto): Promise<{ message: string }> {
    await this.usersService.changePassword(req.user.sub, dto);
    return { message: 'Password updated successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve user by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'OK', type: UserResponseDto })
  @UseGuards(AuthGuard)
  async getUserById(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return UserMapper.toResponse(await this.usersService.getUserById(id)) as UserResponseDto;
  }

  @Patch('roles/:id')
  @ApiOperation({ summary: 'Role change by ID' })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async rollChange(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<{ message: string }> {
    await this.usersService.rollChange(userId, dto);
    return { message: 'Roles updated successfully' };
  }

  @Put('update/user')
  @ApiOperation({ summary: 'Update user information' })
  @ApiBody({ type: UpdateUserDbDto })
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateUser(@Req() req: AuthRequest, @Body() updateData: UpdateUserDbDto): Promise<UserResponseDto> {
    const user = await this.usersService.updateUserService(req.user.sub, updateData);
    return UserMapper.toResponse(user) as UserResponseDto;
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user by ID (soft delete)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User unique identifier',
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return await this.usersService.deleteUser(id);
  }

  @Patch('restore/:id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restore deleted user (soft delete)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User ID to restore',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully restored',
    type: UserResponseDto,
  })
  async restoreUser(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.usersService.restoreUser(id);
    return UserMapper.toResponse(user) as UserResponseDto;
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password recovery' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'If the email exists, a reset link is sent.',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.usersService.sendResetPasswordEmail(dto.email);
    return {
      message: 'If the email exists, the password reset link has been sent.',
    };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using email token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.usersService.resetPassword(dto);
    return { message: 'Password reset successfully' };
  }

  @Get('stats/me')
  @ApiOperation({
    summary: 'Get personal user statistics',
    description:
      'Returns statistics of the authenticated user: total orders, total spent, products on wishlist and reviews',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully Obtained Statistics',
    schema: {
      type: 'object',
      properties: {
        totalOrders: { type: 'number', example: 15 },
        totalSpent: { type: 'number', example: 5499.99 },
        wishlistItemsCount: { type: 'number', example: 8 },
        reviewsCount: { type: 'number', example: 12 },
      },
    },
  })
  @UseGuards(AuthGuard)
  async getMyStats(@Req() req: AuthRequest): Promise<{
    totalOrders: number;
    totalSpent: number;
    wishlistItemsCount: number;
    reviewsCount: number;
  }> {
    return await this.usersService.getUserStats(req.user.sub);
  }

  // ==================== ADDRESS MANAGEMENT ==================================================================================

  @Get('addresses/my-addresses')
  @ApiOperation({ summary: 'Get all addresses for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of user addresses',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async getAddresses(@Req() req: AuthRequest): Promise<UserAddressDto[]> {
    return await this.usersService.getByUserAddresses(req.user.sub);
  }

  @Get('addresses/my-addresses')
  @ApiOperation({ summary: 'Get all addresses for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of user addresses',
  })
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(UserRole.CLIENT)
  async getMyAddresses(@Req() req: AuthRequest): Promise<UserAddressDto[]> {
    return await this.usersService.getByUserAddresses(req.user.sub);
  }

  @Post('addresses/add')
  @ApiOperation({ summary: 'Add a new address for the authenticated user' })
  @ApiBody({ type: CreateAddressDto })
  @ApiResponse({
    status: 201,
    description: 'Address created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        label: { type: 'string' },
        street: { type: 'string' },
        city: { type: 'string' },
        province: { type: 'string' },
        postalCode: { type: 'string' },
        country: { type: 'string' },
        isDefault: { type: 'boolean' },
      },
    },
  })
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async addAddress(@Req() req: AuthRequest, @Body() dto: CreateAddressDto): Promise<UserAddressDto> {
    return await this.usersService.addAddress(req.user.sub, dto);
  }

  @Patch('addresses/:addressId')
  @ApiOperation({ summary: 'Update an existing address' })
  @ApiParam({
    name: 'addressId',
    type: String,
    description: 'Address UUID',
  })
  @ApiBody({ type: UpdateAddressDto })
  @ApiResponse({
    status: 200,
    description: 'Address updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        label: { type: 'string' },
        street: { type: 'string' },
        city: { type: 'string' },
        province: { type: 'string' },
        postalCode: { type: 'string' },
        country: { type: 'string' },
        isDefault: { type: 'boolean' },
      },
    },
  })
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateAddress(
    @Req() req: AuthRequest,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<UserAddressDto> {
    return await this.usersService.updateAddress(req.user.sub, addressId, dto);
  }

  @Delete('addresses/:addressId')
  @ApiOperation({ summary: 'Delete an address' })
  @ApiParam({
    name: 'addressId',
    type: String,
    description: 'Address UUID to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Address deleted successfully',
  })
  @UseGuards(AuthGuard)
  async deleteAddress(@Param('addressId', ParseUUIDPipe) addressId: string): Promise<{ message: string }> {
    return await this.usersService.deleteAddress(addressId);
  }

  @Patch('addresses/:addressId/set-default')
  @ApiOperation({ summary: 'Set an address as default' })
  @ApiParam({
    name: 'addressId',
    type: String,
    description: 'Address UUID to set as default',
  })
  @ApiResponse({
    status: 200,
    description: 'Default address updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        label: { type: 'string' },
        street: { type: 'string' },
        city: { type: 'string' },
        province: { type: 'string' },
        postalCode: { type: 'string' },
        country: { type: 'string' },
        isDefault: { type: 'boolean' },
      },
    },
  })
  @UseGuards(AuthGuard)
  async setDefaultAddress(
    @Req() req: AuthRequest,
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ): Promise<UserAddressDto> {
    return await this.usersService.setDefaultAddress(req.user.sub, addressId);
  }
}
