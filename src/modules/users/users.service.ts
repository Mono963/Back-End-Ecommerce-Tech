import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Users } from './Entyties/users.entity';
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

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async getUsers(searchQuery: UserSearchQueryDto): Promise<IPaginatedResult<Users>> {
    const { username, email, ...pagination } = searchQuery;

    if (!username && !email) {
      return await paginate(this.usersRepository, pagination, {
        order: { createdAt: 'DESC' },
        withDeleted: true,
        select: [
          'id',
          'name',
          'email',
          'birthdate',
          'phone',
          'address',
          'username',
          'isAdmin',
          'isSuperAdmin',
          'createdAt',
          'deletedAt',
        ],
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
      'user.isAdmin',
      'user.isSuperAdmin',
      'user.createdAt',
      'user.deletedAt',
    ]);

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

  async getUserById(id: string): Promise<Users> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['orders', 'cart'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado.`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<Users | null> {
    return await this.usersRepository.findOne({
      where: { email },
      select: [
        'id',
        'name',
        'email',
        'password',
        'birthdate',
        'phone',
        'address',
        'username',
        'isAdmin',
        'isSuperAdmin',
        'createdAt',
        'deletedAt',
      ],
    });
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
        delete dto[campo];
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
      });

      if (!user) {
        throw new NotFoundException(`Usuario con id ${userId} no encontrado`);
      }

      await this.usersRepository.update(user.id, dto);
    } catch (error) {
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
}
