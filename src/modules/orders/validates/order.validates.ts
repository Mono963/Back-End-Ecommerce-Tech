import { BadRequestException, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '../enum/order.enum';

export class OrderValidations {
  private static readonly logger = new Logger(OrderValidations.name);

  static validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID],
      [OrderStatus.PAID]: [OrderStatus.PROCESSING],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    const allowedStatuses = validTransitions[currentStatus];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(`Cannot change status from ${currentStatus} to ${newStatus}`);
    }
  }

  static handleOrderCreationErrorValidate(error: unknown): never {
    if (error instanceof NotFoundException || error instanceof BadRequestException) {
      throw error;
    }
    this.logger.error('Error creating order:', error);
    throw new InternalServerErrorException('Error creating order');
  }
}
