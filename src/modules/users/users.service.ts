import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Users } from './entities/users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSearchQueryDto } from './dtos/PaginationQueryDto';
import { paginate } from 'src/common/pagination/paginate';
import { AuthValidations } from '../auths/validate/auth.validate';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { MailQueueService } from '../mail/mail-queue_email.service';
import { IPaginatedResult } from '../../common/pagination/IPaginatedResult';
import { RolesService } from '../roles/roles.service';
import {
  ICreateAddress,
  ICreateUserDb,
  IResetPassword,
  IUpdateAddress,
  IUpdatePassword,
  IUpdateRole,
  IUpdateUserDb,
  IAddress,
  INewCreateAddress,
} from './interfaces/user.interface';
import { Order } from '../orders/entities/order.entity';
import { Wishlist } from '../wishlist/entities/wishlist.entity';
import { Review } from '../review/entities/review.entity';
import { Address } from './entities/address.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly configService: ConfigService,
    private readonly mailQueueService: MailQueueService,
    private readonly rolesService: RolesService,
  ) {}

  async getUsers(searchQuery: UserSearchQueryDto): Promise<IPaginatedResult<Users>> {
    const { username, email, ...pagination } = searchQuery;

    if (!username && !email) {
      return await paginate(this.usersRepository, pagination, {
        order: { createdAt: 'DESC' },
        withDeleted: true,
        relations: ['role', 'addresses'],
        select: ['id', 'name', 'email', 'birthDate', 'phone', 'username', 'createdAt', 'deletedAt'],
      });
    }

    const queryBuilder = this.usersRepository.createQueryBuilder('user');
    queryBuilder.withDeleted();
    queryBuilder.select([
      'user.id',
      'user.name',
      'user.email',
      'user.birthdate',
      'user.phone',
      'user.username',
      'user.createdAt',
      'user.deletedAt',
    ]);

    queryBuilder.leftJoinAndSelect('user.role', 'role');
    queryBuilder.leftJoinAndSelect('user.orders', 'orders');
    queryBuilder.leftJoinAndSelect('user.cart', 'cart');
    queryBuilder.where('1 = 1');

    if (username) {
      queryBuilder.andWhere('LOWER(user.username) LIKE LOWER(:username)', {
        username: `%${username}%`,
      });
    }

    if (email) {
      queryBuilder.andWhere('LOWER(user.email) LIKE LOWER(:email)', {
        email: `%${email}%`,
      });
    }

    queryBuilder.orderBy('user.createdAt', 'DESC');

    const skip = (pagination.page - 1) * pagination.limit;
    queryBuilder.skip(skip).take(pagination.limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const pages = Math.ceil(total / pagination.limit);

    return {
      items,
      total,
      pages,
    } as IPaginatedResult<Users>;
  }

  async getUserById(id: string): Promise<Users & { wishlistCount: number }> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['orders', 'cart', 'role', 'addresses'],
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found.`);
    }

    // Obtener el contador de wishlist
    const wishlist = await this.wishlistRepository.findOne({
      where: { user_id: id },
      relations: ['items'],
    });

    // Add wishlist count to the user object (used by the DTO)
    const userWithWishlist = Object.assign(user, { wishlistCount: wishlist?.items?.length ?? 0 });

    return userWithWishlist;
  }

  async createUserService(dto: ICreateUserDb): Promise<Users> {
    try {
      const user = this.usersRepository.create(dto);
      return await this.usersRepository.save(user);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error creating user:', error);
      throw new BadRequestException('Failed to create user');
    }
  }

  async updateUserService(id: string, dto: IUpdateUserDb): Promise<Users> {
    const camposRestringidos = ['isAdmin', 'isSuperAdmin'];

    for (const campo of camposRestringidos) {
      if (Object.prototype.hasOwnProperty.call(dto, campo)) {
        delete (dto as Record<string, unknown>)[campo];
      }
    }

    if (dto.username) {
      const existingUser = await this.usersRepository.findOne({
        where: { username: dto.username },
        select: ['id', 'username'],
      });

      if (existingUser && existingUser.id !== id) {
        AuthValidations.validateUserNameExist(dto.username, existingUser);
      }
    }

    if (dto.password) {
      dto.password = await AuthValidations.hashPassword(dto.password);
    }

    const result = await this.usersRepository.update({ id }, dto);

    if (result.affected === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const updatedUser = await this.usersRepository.findOne({
      where: { id },
      relations: ['orders', 'cart'],
    });

    if (!updatedUser) {
      throw new InternalServerErrorException(`Unexpected error: User with id ${id} not found after final update`);
    }

    this.mailQueueService.queueDataChangedNotification(updatedUser.email, updatedUser.name).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unknown error while enqueuing data change email';
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(message, stack);
    });

    return updatedUser;
  }

  async changePassword(userId: string, dto: IUpdatePassword): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);

    if (isSamePassword) {
      throw new BadRequestException('New password cannot be the same as the current one');
    }

    await AuthValidations.validateNewPasswordIsDifferent(dto.newPassword, user.password);

    await AuthValidations.validatePassword(dto.currentPassword, user.password);

    const hashedPassword = await AuthValidations.hashPassword(dto.newPassword);

    user.password = hashedPassword;
    await this.usersRepository.save(user);

    this.mailQueueService.queuePasswordChangedConfirmation(user.email, user.name).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Error enqueuing email';
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(message, stack);
    });
  }

  async rollChange(userId: string, dto: IUpdateRole): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        relations: ['role'],
      });

      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      const role = await this.rolesService.findRoleById(dto.roleId);

      user.role = role;
      await this.usersRepository.save(user);

      this.logger.log(`Role updated for user ${userId}: ${role.name}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error changing user role:', error);
      throw new InternalServerErrorException('Error changing user role');
    }
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    try {
      const user = await this.usersRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User: ${id} not found`);
      }

      const result = await this.usersRepository.softDelete(id);

      if (!result.affected) {
        throw new NotFoundException(`User: ${id} not found`);
      }

      await this.mailQueueService.queueAccountDeletedNotification(user.email, user.name);

      return { message: `User ${id} successfully removed.` };
    } catch (error) {
      this.logger.error('Error: Failed to delete account, please try again later', error);
      throw new InternalServerErrorException(`Error deleting User ${id}`);
    }
  }

  async restoreUser(id: string): Promise<Users> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id },
        withDeleted: true,
        select: ['id', 'deletedAt'],
      });

      if (!user) {
        throw new NotFoundException(`User: ${id} not found`);
      }

      if (!user.deletedAt) {
        throw new BadRequestException(`User: ${id} is not deleted`);
      }

      const result = await this.usersRepository.restore(id);

      if (!result.affected) {
        throw new NotFoundException(`User: ${id} could not be restored`);
      }

      const restoredUser = await this.getUserById(id);
      return restoredUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Internal error restoring user ${id}:`, error instanceof Error ? error.message : String(error));
      throw new InternalServerErrorException(`Error restoring User ${id}`);
    }
  }

  async sendResetPasswordEmail(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(email)}`;

    await this.mailQueueService.queuePasswordResetEmail(user.email, user.name, resetUrl);
  }

  async resetPassword(dto: IResetPassword): Promise<void> {
    const { token, newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.usersRepository.findOne({
      where: { email: token },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await AuthValidations.hashPassword(newPassword);
    user.password = hashedPassword;
    await this.usersRepository.save(user);

    await this.mailQueueService.queuePasswordChangedConfirmation(user.email, user.name);
  }

  // ==================== ADDRESS MANAGEMENT ==================================================================================
  async getAddresses(): Promise<IAddress[]> {
    const address = await this.addressRepository.find();

    if (!address) {
      throw new NotFoundException('No addresses found');
    }

    return address;
  }

  async getByUserAddresses(userId: string): Promise<IAddress[]> {
    const addresses = await this.addressRepository.find({
      where: { user_id: userId },
    });

    if (addresses.length === 0) {
      throw new NotFoundException(`El usuario con id ${userId} no tiene direcciones`);
    }

    return addresses.map((addr) => ({
      id: addr.id,
      label: addr.label,
      street: addr.street,
      city: addr.city,
      province: addr.province,
      postalCode: addr.postalCode,
      country: addr.country,
      isDefault: addr.isDefault,
    }));
  }

  async addAddress(userId: string, dto: ICreateAddress): Promise<IAddress> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['addresses'],
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const newAddressData: INewCreateAddress = {
      label: dto.label,
      street: dto.street,
      city: dto.city,
      province: dto.province,
      postalCode: dto.postalCode,
      country: dto.country || 'Argentina',
      user_id: user.id,
      isDefault: dto.isDefault ?? false,
    };

    if (!user.addresses || user.addresses.length === 0) {
      newAddressData.isDefault = true;
    }

    if (newAddressData.isDefault && user.addresses?.length) {
      await this.addressRepository.update({ user_id: user.id }, { isDefault: false });
    }

    const savedAddress = await this.addressRepository.save(this.addressRepository.create(newAddressData));

    this.logger.log(`Address added for user ${userId}: ${savedAddress.id}`);

    return {
      id: savedAddress.id,
      label: savedAddress.label,
      street: savedAddress.street,
      city: savedAddress.city,
      province: savedAddress.province,
      postalCode: savedAddress.postalCode,
      country: savedAddress.country,
      isDefault: savedAddress.isDefault,
    };
  }

  async updateAddress(userId: string, addressId: string, dto: IUpdateAddress): Promise<IAddress> {
    const address = await this.addressRepository.findOne({
      where: {
        id: addressId,
        user_id: userId,
      },
    });

    if (!address) {
      throw new NotFoundException(`Address with id ${addressId} not found for user ${userId}`);
    }

    if (dto.isDefault === true) {
      await this.addressRepository.update({ user_id: userId }, { isDefault: false });
    }

    Object.assign(address, dto);

    const updatedAddress = await this.addressRepository.save(address);

    this.logger.log(`Address updated for user ${userId}: ${addressId}`);

    return {
      id: updatedAddress.id,
      label: updatedAddress.label,
      street: updatedAddress.street,
      city: updatedAddress.city,
      province: updatedAddress.province,
      postalCode: updatedAddress.postalCode,
      country: updatedAddress.country,
      isDefault: updatedAddress.isDefault,
    };
  }

  async deleteAddress(addressId: string): Promise<{ message: string }> {
    const address = await this.addressRepository.findOne({ where: { id: addressId } });
    if (!address) {
      throw new NotFoundException(`Address with id ${addressId} not found`);
    }

    await this.addressRepository.delete(address.id);

    return { message: 'Address deleted successfully' };
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<IAddress> {
    const address = await this.addressRepository.findOne({
      where: {
        id: addressId,
        user_id: userId,
      },
    });

    if (!address) {
      throw new NotFoundException(`Address with id ${addressId} not found for user ${userId}`);
    }

    await this.addressRepository.update({ user_id: userId }, { isDefault: false });

    address.isDefault = true;
    const updatedAddress = await this.addressRepository.save(address);

    this.logger.log(`Default address updated for user ${userId}: ${addressId}`);

    return {
      id: updatedAddress.id,
      label: updatedAddress.label,
      street: updatedAddress.street,
      city: updatedAddress.city,
      province: updatedAddress.province,
      postalCode: updatedAddress.postalCode,
      country: updatedAddress.country,
      isDefault: updatedAddress.isDefault,
    };
  }

  async getUserStats(userId: string): Promise<{
    totalOrders: number;
    totalSpent: number;
    wishlistItemsCount: number;
    reviewsCount: number;
  }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Count orders and calculate total spent
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderDetail', 'orderDetail')
      .where('order.user_id = :userId', { userId })
      .andWhere('order.status != :cancelledStatus', { cancelledStatus: 'cancelled' })
      .getMany();

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => {
      return sum + (order.orderDetail?.total || 0);
    }, 0);

    // Contar items en wishlist
    const wishlist = await this.wishlistRepository.findOne({
      where: { user_id: userId },
      relations: ['items'],
    });

    const wishlistItemsCount = wishlist?.items?.length || 0;

    // Contar reviews
    const reviewsCount = await this.reviewRepository.count({
      where: { user: { id: userId } },
    });

    this.logger.log(`Stats retrieved for user ${userId}`);

    return {
      totalOrders,
      totalSpent: Math.round(totalSpent * 100) / 100,
      wishlistItemsCount,
      reviewsCount,
    };
  }
}
