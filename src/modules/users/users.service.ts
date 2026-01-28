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
import { CreateUserDbDto, UpdateUserDbDto } from './Dtos/CreateUserDto';
import { UserSearchQueryDto } from './Dtos/PaginationQueryDto';
import { paginate } from 'src/common/pagination/paginate';
import { UpdatePasswordDto } from './Dtos/UpdatePasswordDto';
import { AuthValidations } from '../auths/validate/auth.validate';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { UpdateRoleDto } from './Dtos/UpdateRoleDto';
import { ResetPasswordDto } from './Dtos/reset-password.dto';
import { IPaginatedResult } from './interface/IPaginatedResult';
import { RolesService } from '../roles/roles.service';
import { CreateAddressDto, UpdateAddressDto } from './Dtos/address.dto';
import { UserAddress } from './interface/IUserResponseDto';
import { v4 as uuidv4 } from 'uuid';
import { Order } from '../orders/entities/order.entity';
import { Wishlist } from '../wishlist/entities/wishlist.entity';
import { Review } from '../review/entities/review.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly rolesService: RolesService,
  ) {}

  async getUsers(searchQuery: UserSearchQueryDto): Promise<IPaginatedResult<Users>> {
    const { username, email, ...pagination } = searchQuery;

    if (!username && !email) {
      return await paginate(this.usersRepository, pagination, {
        order: { createdAt: 'DESC' },
        withDeleted: true,
        relations: ['role'],
        select: ['id', 'name', 'email', 'birthDate', 'phone', 'address', 'username', 'createdAt', 'deletedAt'],
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
      'user.address',
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
      relations: ['orders', 'cart', 'role'],
      select: [
        'id',
        'name',
        'email',
        'birthDate',
        'phone',
        'address',
        'addresses',
        'username',
        'createdAt',
        'deletedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado.`);
    }

    // Obtener el contador de wishlist
    const wishlist = await this.wishlistRepository.findOne({
      where: { user_id: id },
      relations: ['items'],
    });

    // Agregar el contador al objeto user (será usado por el DTO)
    const userWithWishlist = Object.assign(user, { wishlistCount: wishlist?.items?.length ?? 0 });

    return userWithWishlist;
  }

  async createUserService(dto: CreateUserDbDto): Promise<Users> {
    try {
      const user = this.usersRepository.create(dto);
      return await this.usersRepository.save(user);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Error creating user:', error);
      throw new BadRequestException('Error al crear el usuario');
    }
  }

  async updateUserService(id: string, dto: UpdateUserDbDto): Promise<Users> {
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
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    const updatedUser = await this.usersRepository.findOne({
      where: { id },
      relations: ['orders', 'cart'], // Actualizado según la entidad
    });

    if (!updatedUser) {
      throw new InternalServerErrorException(
        `Error inesperado: Usuario con id ${id} no encontrado tras la actualización final`,
      );
    }

    this.mailService.sendUserDataChangedNotification(updatedUser.email, updatedUser.name).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Error desconocido al enviar email de modificación de datos';
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(message, stack);
    });

    return updatedUser;
  }

  async changePassword(userId: string, dto: UpdatePasswordDto): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${userId} no encontrado`);
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);

    if (isSamePassword) {
      throw new BadRequestException('La nueva contraseña no puede ser igual a la actual');
    }

    await AuthValidations.validateNewPasswordIsDifferent(dto.newPassword, user.password);

    await AuthValidations.validatePassword(dto.currentPassword, user.password);

    const hashedPassword = await AuthValidations.hashPassword(dto.newPassword);

    user.password = hashedPassword;
    await this.usersRepository.save(user);

    this.mailService.sendPasswordChangedConfirmationEmail(user.email, user.name).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Error sending email';
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(message, stack);
    });
  }

  async rollChange(userId: string, dto: UpdateRoleDto): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        relations: ['role'],
      });

      if (!user) {
        throw new NotFoundException(`Usuario con id ${userId} no encontrado`);
      }

      const role = await this.rolesService.findRoleById(dto.roleId);

      user.role = role;
      await this.usersRepository.save(user);

      this.logger.log(`Rol actualizado para usuario ${userId}: ${role.name}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error changing user role:', error);
      throw new InternalServerErrorException('Error al cambiar el rol del usuario');
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

      await this.mailService.sendAccountDeletedNotification(user.email, user.name);

      return { message: `User ${id} successfully removed.` };
    } catch (error) {
      this.logger.error('Error: Al eliminar la cuenta intente mas tarde', error);
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

      this.logger.error(
        `Error interno al restaurar usuario ${id}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw new InternalServerErrorException(`Error restoring User ${id}`);
    }
  }

  async sendResetPasswordEmail(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Credenciales inválidas');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(email)}`;

    await this.mailService.sendPasswordResetEmail(user.email, user.name, resetUrl);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const { token, newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const user = await this.usersRepository.findOne({
      where: { email: token },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const hashedPassword = await AuthValidations.hashPassword(newPassword);
    user.password = hashedPassword;
    await this.usersRepository.save(user);

    await this.mailService.sendPasswordChangedConfirmationEmail(user.email, user.name);
  }

  // ==================== ADDRESS MANAGEMENT ====================

  /**
   * Obtiene todas las direcciones de un usuario
   * @param userId - ID del usuario
   * @returns Array de direcciones del usuario
   */
  async getAddresses(userId: string): Promise<UserAddress[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'addresses'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${userId} no encontrado`);
    }

    return user.addresses || [];
  }

  /**
   * Agrega una nueva dirección al usuario
   * Genera un UUID único y actualiza el array JSONB
   * Si isDefault es true, desmarca todas las demás direcciones como no-default
   */
  async addAddress(userId: string, dto: CreateAddressDto): Promise<UserAddress> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'addresses'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${userId} no encontrado`);
    }

    // Generar UUID único para la nueva dirección
    const newAddress: UserAddress = {
      id: uuidv4(), // ← Genera UUID en Node.js
      label: dto.label,
      street: dto.street,
      city: dto.city,
      province: dto.province,
      postalCode: dto.postalCode,
      country: dto.country || 'Argentina',
      isDefault: dto.isDefault ?? false,
    };

    // Si no hay direcciones, esta es la primera y debe ser default
    const addresses = user.addresses || [];
    if (addresses.length === 0) {
      newAddress.isDefault = true;
    }

    // Si la nueva dirección es default, desmarcar las demás
    if (newAddress.isDefault) {
      addresses.forEach((addr) => (addr.isDefault = false));
    }

    // Agregar la nueva dirección al array
    user.addresses = [...addresses, newAddress];

    // Guardar en la base de datos (JSONB se actualiza completamente)
    await this.usersRepository.save(user);

    this.logger.log(`Dirección agregada para usuario ${userId}: ${newAddress.id}`);

    return newAddress;
  }

  /**
   * Actualiza una dirección existente
   * Busca por addressId en el array JSONB y actualiza los campos
   */
  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<UserAddress> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'addresses'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${userId} no encontrado`);
    }

    const addresses = user.addresses || [];
    const addressIndex = addresses.findIndex((addr) => addr.id === addressId);

    if (addressIndex === -1) {
      throw new NotFoundException(`Dirección con id ${addressId} no encontrada`);
    }

    // Si se está marcando como default, desmarcar las demás
    if (dto.isDefault === true) {
      addresses.forEach((addr, idx) => {
        if (idx !== addressIndex) {
          addr.isDefault = false;
        }
      });
    }

    // Actualizar los campos de la dirección
    addresses[addressIndex] = {
      ...addresses[addressIndex],
      ...dto,
    };

    user.addresses = addresses;
    await this.usersRepository.save(user);

    this.logger.log(`Dirección actualizada para usuario ${userId}: ${addressId}`);

    return addresses[addressIndex];
  }

  /**
   * Elimina una dirección del usuario
   * Si la dirección eliminada era default, marca la primera como default
   */
  async deleteAddress(userId: string, addressId: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'addresses'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${userId} no encontrado`);
    }

    const addresses = user.addresses || [];
    const addressToDelete = addresses.find((addr) => addr.id === addressId);

    if (!addressToDelete) {
      throw new NotFoundException(`Dirección con id ${addressId} no encontrada`);
    }

    // Filtrar la dirección a eliminar
    const updatedAddresses = addresses.filter((addr) => addr.id !== addressId);

    // Si la dirección eliminada era default y hay más direcciones, marcar la primera como default
    if (addressToDelete.isDefault && updatedAddresses.length > 0) {
      updatedAddresses[0].isDefault = true;
    }

    user.addresses = updatedAddresses;
    await this.usersRepository.save(user);

    this.logger.log(`Dirección eliminada para usuario ${userId}: ${addressId}`);

    return { message: 'Dirección eliminada exitosamente' };
  }

  /**
   * Marca una dirección como predeterminada
   * Desmarca todas las demás direcciones
   */
  async setDefaultAddress(userId: string, addressId: string): Promise<UserAddress> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'addresses'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${userId} no encontrado`);
    }

    const addresses = user.addresses || [];
    const targetAddress = addresses.find((addr) => addr.id === addressId);

    if (!targetAddress) {
      throw new NotFoundException(`Dirección con id ${addressId} no encontrada`);
    }

    // Desmarcar todas y marcar solo la seleccionada
    addresses.forEach((addr) => {
      addr.isDefault = addr.id === addressId;
    });

    user.addresses = addresses;
    await this.usersRepository.save(user);

    this.logger.log(`Dirección predeterminada actualizada para usuario ${userId}: ${addressId}`);

    return targetAddress;
  }

  /**
   * Obtiene las estadísticas personales del usuario
   */
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
      throw new NotFoundException(`Usuario con id ${userId} no encontrado`);
    }

    // Contar órdenes y calcular total gastado
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

    this.logger.log(`Estadísticas obtenidas para usuario ${userId}`);

    return {
      totalOrders,
      totalSpent: Math.round(totalSpent * 100) / 100,
      wishlistItemsCount,
      reviewsCount,
    };
  }
}
