import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefundRequest } from './entities/refund-request.entity';
import { RefundStatus } from './enum/refund.enum';
import { MailQueueService } from '../mail/mail-queue_email.service';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/enum/order.enum';
import { ICreateRefund, IAdminRefundAction } from './interface/refund.interface';
import { PaginatedRefundsDto, RefundSearchQueryDto } from './dto/paginate.refund.dto';

const REFUNDABLE_STATUSES = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    @InjectRepository(RefundRequest)
    private readonly refundRepository: Repository<RefundRequest>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly mailQueueService: MailQueueService,
  ) {}

  private sanitizeInput(value: string): string {
    return value
      .replace(/[\r\n]/g, ' ')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  async createRefundRequest(
    userId: string,
    dto: ICreateRefund,
  ): Promise<{ message: string; refundId: string }> {
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId },
      relations: ['user', 'orderDetail', 'payment'],
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.user_id !== userId) {
      throw new ForbiddenException('Esta orden no te pertenece');
    }

    if (!REFUNDABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        'El estado de la orden no permite solicitar un reembolso',
      );
    }

    const existingPending = await this.refundRepository.findOne({
      where: { orderId: dto.orderId, status: RefundStatus.PENDING },
    });

    if (existingPending) {
      throw new BadRequestException(
        'Ya existe una solicitud de reembolso pendiente para esta orden',
      );
    }

    const refund = this.refundRepository.create({
      orderId: dto.orderId,
      userId,
      reason: this.sanitizeInput(dto.reason),
      description: this.sanitizeInput(dto.description),
    });

    const saved = await this.refundRepository.save(refund);
    this.logger.log(`Refund request created: ${saved.id} for order ${dto.orderId}`);

    await this.mailQueueService.queueRefundRequestConfirmation(
      order.user.email,
      order.user.name,
      order.orderNumber,
      saved.reason,
      saved.description,
      saved.id,
    );

    await this.mailQueueService.queueRefundRequestNotificationToAdmin(
      order.user.name,
      order.user.email,
      order.orderNumber,
      saved.reason,
      saved.description,
      saved.id,
      Number(order.orderDetail.total),
    );

    return {
      message: 'Solicitud de reembolso enviada correctamente',
      refundId: saved.id,
    };
  }

  async getUserRefunds(userId: string): Promise<RefundRequest[]> {
    return this.refundRepository.find({
      where: { userId },
      relations: ['order'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllRefunds(searchQuery: RefundSearchQueryDto): Promise<PaginatedRefundsDto> {
    const { page, limit, status, userId } = searchQuery;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [items, total] = await this.refundRepository.findAndCount({
      where,
      relations: ['order', 'user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      total,
      pages: Math.ceil(total / limit),
      items,
    };
  }

  async getRefundById(id: string): Promise<RefundRequest> {
    const refund = await this.refundRepository.findOne({
      where: { id },
      relations: ['order', 'order.orderDetail', 'order.payment', 'user'],
    });

    if (!refund) {
      throw new NotFoundException(`Solicitud de reembolso con ID ${id} no encontrada`);
    }

    return refund;
  }

  async approveRefund(id: string, dto: IAdminRefundAction): Promise<RefundRequest> {
    const refund = await this.getRefundById(id);

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException(
        `No se puede aprobar una solicitud con estado "${refund.status}"`,
      );
    }

    refund.status = RefundStatus.APPROVED;
    refund.adminResponse = dto.adminResponse;

    const updated = await this.refundRepository.save(refund);
    this.logger.log(`Refund ${id} approved`);

    const orderTotal = Number(refund.order.orderDetail?.total ?? 0);
    const paymentMethod = refund.order.payment?.paymentMethodId ?? 'Medio de pago original';

    await this.mailQueueService.queueRefundProcessedEmail(
      refund.user.email,
      refund.user.name,
      refund.order.orderNumber,
      orderTotal,
      paymentMethod,
      null,
      refund.id,
    );

    return updated;
  }

  async rejectRefund(id: string, dto: IAdminRefundAction): Promise<RefundRequest> {
    const refund = await this.getRefundById(id);

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException(
        `No se puede rechazar una solicitud con estado "${refund.status}"`,
      );
    }

    refund.status = RefundStatus.REJECTED;
    refund.adminResponse = dto.adminResponse;

    const updated = await this.refundRepository.save(refund);
    this.logger.log(`Refund ${id} rejected`);

    await this.mailQueueService.queueRefundRejectedEmail(
      refund.user.email,
      refund.user.name,
      refund.order.orderNumber,
      dto.adminResponse,
      refund.id,
    );

    return updated;
  }
}
