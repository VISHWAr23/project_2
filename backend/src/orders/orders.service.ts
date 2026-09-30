// User instruction: "Phase 6: Order Management - Create OrdersService with RBAC, state machine, and money calculations"
// Importers/callers: orders.controller.ts, orders.module.ts
// Affected API: /api/orders (findAll, findById, create, update, approve, reject, complete, cancel)
// Data schemas: Order, OrderItem, OrderStatus, Customer, User, CreateOrderDto, UpdateOrderDto, QueryOrderDto, RejectOrderDto

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderStatus } from './schemas/order.schema.js';
import { Customer } from '../customers/schemas/customer.schema.js';
import { User, UserRole } from '../users/schemas/user.schema.js';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { RejectOrderDto } from './dto/reject-order.dto.js';
import { IncentivesService } from '../incentives/incentives.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly incentivesService?: IncentivesService,
    private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Deterministic money calculation strategy:
   * Rounds item totals and the aggregate order amount to 2 decimal places to prevent IEEE 754 float drift.
   */
  public calculateTotals(items: CreateOrderItemDto[]) {
    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const processedItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (isNaN(quantity) || quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than zero');
      }
      if (isNaN(unitPrice) || unitPrice < 0) {
        throw new BadRequestException('Unit price cannot be negative');
      }
      if (!item.productName || !item.productName.trim()) {
        throw new BadRequestException('Product name is required');
      }

      const totalPrice = Math.round(quantity * unitPrice * 100) / 100;
      return {
        productName: item.productName.trim(),
        quantity,
        unitPrice,
        totalPrice,
      };
    });

    const totalAmount =
      Math.round(
        processedItems.reduce((acc, curr) => acc + curr.totalPrice, 0) * 100,
      ) / 100;

    return { processedItems, totalAmount };
  }

  /**
   * Centralized Order State Machine validation
   */
  public validateTransition(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    role: UserRole,
  ) {
    if (currentStatus === targetStatus) {
      throw new BadRequestException(
        `Order is already in ${currentStatus} status`,
      );
    }

    // Terminal states cannot transition to anything
    if (
      currentStatus === OrderStatus.COMPLETED ||
      currentStatus === OrderStatus.REJECTED ||
      currentStatus === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot transition order from terminal state ${currentStatus} to ${targetStatus}`,
      );
    }

    switch (targetStatus) {
      case OrderStatus.APPROVED:
        if (role !== UserRole.ADMIN) {
          throw new ForbiddenException(
            'Only administrators can approve orders',
          );
        }
        if (currentStatus !== OrderStatus.PENDING) {
          throw new BadRequestException('Only PENDING orders can be approved');
        }
        break;

      case OrderStatus.REJECTED:
        if (role !== UserRole.ADMIN) {
          throw new ForbiddenException('Only administrators can reject orders');
        }
        if (currentStatus !== OrderStatus.PENDING) {
          throw new BadRequestException('Only PENDING orders can be rejected');
        }
        break;

      case OrderStatus.COMPLETED:
        if (role !== UserRole.ADMIN) {
          throw new ForbiddenException(
            'Only administrators can mark orders as completed',
          );
        }
        if (currentStatus !== OrderStatus.APPROVED) {
          throw new BadRequestException(
            'Only APPROVED orders can be marked as COMPLETED',
          );
        }
        break;

      case OrderStatus.CANCELLED:
        if (role === UserRole.EMPLOYEE) {
          if (currentStatus !== OrderStatus.PENDING) {
            throw new BadRequestException(
              'Employees can only cancel PENDING orders',
            );
          }
        } else if (role === UserRole.ADMIN) {
          if (
            currentStatus !== OrderStatus.PENDING &&
            currentStatus !== OrderStatus.APPROVED
          ) {
            throw new BadRequestException(
              'Admins can only cancel PENDING or APPROVED orders',
            );
          }
        }
        break;

      default:
        throw new BadRequestException(
          `Invalid target order status: ${targetStatus}`,
        );
    }
  }

  async findAll(
    query: QueryOrderDto,
    requestingUser: { _id: string; role: string },
  ) {
    const {
      page = 1,
      limit = 10,
      employeeId,
      customerId,
      status,
      startDate,
      endDate,
    } = query;
    const filter: Record<string, any> = {};

    // Strict RBAC: Employees can ONLY view their own orders
    if (requestingUser.role === UserRole.EMPLOYEE) {
      filter.employee = new Types.ObjectId(requestingUser._id);
      if (customerId) {
        filter.customer = new Types.ObjectId(customerId);
      }
    } else if (requestingUser.role === UserRole.ADMIN) {
      if (employeeId) {
        filter.employee = new Types.ObjectId(employeeId);
      }
      if (customerId) {
        filter.customer = new Types.ObjectId(customerId);
      }
    }

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) {
        filter.orderDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.orderDate.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('customer', 'customerName businessName phone address')
        .populate('employee', 'name email phone')
        .populate('approvedBy', 'name email')
        .sort({ orderDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string, requestingUser: { _id: string; role: string }) {
    const order = await this.orderModel
      .findById(id)
      .populate('customer', 'customerName businessName phone address')
      .populate('employee', 'name email phone')
      .populate('approvedBy', 'name email')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (requestingUser.role === UserRole.EMPLOYEE) {
      const employeeObjId = (order.employee as any)._id || order.employee;
      if (employeeObjId.toString() !== requestingUser._id.toString()) {
        throw new ForbiddenException('You can only access your own orders');
      }
    }

    return order;
  }

  async create(
    createOrderDto: CreateOrderDto,
    requestingUser: { _id: string; role: string },
  ) {
    // 1. Verify customer exists and is active
    const customer = await this.customerModel
      .findById(createOrderDto.customer)
      .exec();
    if (!customer) {
      throw new BadRequestException('Customer does not exist');
    }
    if (customer.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Inactive customer cannot receive new orders',
      );
    }

    // 2. Validate employee and customer assignment
    let employeeId = createOrderDto.employee;

    if (requestingUser.role === UserRole.EMPLOYEE) {
      employeeId = requestingUser._id;

      // Verify customer is assigned to this employee
      if (
        customer.assignedEmployee.toString() !== requestingUser._id.toString()
      ) {
        throw new ForbiddenException(
          'You can only create orders for your assigned customers',
        );
      }

      // Verify employee is active
      const currentEmployee = await this.userModel
        .findById(requestingUser._id)
        .exec();
      if (
        !currentEmployee ||
        !currentEmployee.isActive ||
        currentEmployee.role !== UserRole.EMPLOYEE
      ) {
        throw new BadRequestException('Inactive employee cannot create orders');
      }
    } else if (requestingUser.role === UserRole.ADMIN) {
      if (!employeeId) {
        employeeId = customer.assignedEmployee.toString();
      }

      const targetEmployee = await this.userModel.findById(employeeId).exec();
      if (!targetEmployee) {
        throw new BadRequestException('Assigned employee does not exist');
      }
      if (targetEmployee.role !== UserRole.EMPLOYEE) {
        throw new BadRequestException('Assigned user must be an EMPLOYEE');
      }
      if (!targetEmployee.isActive) {
        throw new BadRequestException(
          'Cannot assign order to inactive employee',
        );
      }
    }

    // 3. Calculate authoritative totals
    const { processedItems, totalAmount } = this.calculateTotals(
      createOrderDto.items,
    );

    const orderDate = createOrderDto.orderDate
      ? new Date(createOrderDto.orderDate)
      : new Date();

    if (isNaN(orderDate.getTime())) {
      throw new BadRequestException('Invalid order date');
    }

    // 4. Create order with PENDING status (backend enforcement)
    const order = new this.orderModel({
      customer: new Types.ObjectId(customer._id),
      employee: new Types.ObjectId(employeeId),
      orderDate,
      items: processedItems,
      totalAmount,
      notes: createOrderDto.notes ? createOrderDto.notes.trim() : undefined,
      status: OrderStatus.PENDING,
    });

    const saved = await order.save();
    if (this.notificationsService) {
      this.notificationsService.notifyOrderSubmitted(saved).catch(() => {});
    }
    return this.orderModel
      .findById(saved._id)
      .populate('customer', 'customerName businessName phone address')
      .populate('employee', 'name email phone')
      .populate('approvedBy', 'name email')
      .exec();
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    requestingUser: { _id: string; role: string },
  ) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Strict RBAC: Employee can only modify their own order
    if (requestingUser.role === UserRole.EMPLOYEE) {
      if (order.employee.toString() !== requestingUser._id.toString()) {
        throw new ForbiddenException('You can only modify your own orders');
      }
    }

    // State check: Only PENDING orders can be updated
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot edit order with status ${order.status}. Only PENDING orders can be updated.`,
      );
    }

    if (updateOrderDto.items) {
      const { processedItems, totalAmount } = this.calculateTotals(
        updateOrderDto.items,
      );
      order.items = processedItems as any;
      order.totalAmount = totalAmount;
    }

    if (updateOrderDto.orderDate) {
      const newDate = new Date(updateOrderDto.orderDate);
      if (isNaN(newDate.getTime())) {
        throw new BadRequestException('Invalid order date');
      }
      order.orderDate = newDate;
    }

    if (updateOrderDto.notes !== undefined) {
      order.notes = updateOrderDto.notes.trim();
    }

    const saved = await order.save();
    return this.orderModel
      .findById(saved._id)
      .populate('customer', 'customerName businessName phone address')
      .populate('employee', 'name email phone')
      .populate('approvedBy', 'name email')
      .exec();
  }

  async approve(id: string, requestingUser: { _id: string; role: UserRole }) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.validateTransition(
      order.status,
      OrderStatus.APPROVED,
      requestingUser.role,
    );

    order.status = OrderStatus.APPROVED;
    order.approvedBy = new Types.ObjectId(requestingUser._id);
    order.approvedAt = new Date();

    const saved = await order.save();

    // Automatically generate employee incentive upon order approval
    if (this.incentivesService) {
      await this.incentivesService.generateIncentiveForOrder(saved);
    }

    if (this.notificationsService) {
      this.notificationsService.notifyOrderApproved(saved).catch(() => {});
    }

    return this.orderModel
      .findById(saved._id)
      .populate('customer', 'customerName businessName phone address')
      .populate('employee', 'name email phone')
      .populate('approvedBy', 'name email')
      .exec();
  }

  async reject(
    id: string,
    rejectOrderDto: RejectOrderDto,
    requestingUser: { _id: string; role: UserRole },
  ) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.validateTransition(
      order.status,
      OrderStatus.REJECTED,
      requestingUser.role,
    );

    order.status = OrderStatus.REJECTED;
    order.approvedBy = new Types.ObjectId(requestingUser._id);
    order.approvedAt = new Date();
    if (rejectOrderDto?.reason) {
      order.rejectionReason = rejectOrderDto.reason.trim();
    }

    const saved = await order.save();
    if (this.notificationsService) {
      this.notificationsService.notifyOrderRejected(saved).catch(() => {});
    }
    return this.orderModel
      .findById(saved._id)
      .populate('customer', 'customerName businessName phone address')
      .populate('employee', 'name email phone')
      .populate('approvedBy', 'name email')
      .exec();
  }

  async complete(id: string, requestingUser: { _id: string; role: UserRole }) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.validateTransition(
      order.status,
      OrderStatus.COMPLETED,
      requestingUser.role,
    );

    order.status = OrderStatus.COMPLETED;

    const saved = await order.save();
    return this.orderModel
      .findById(saved._id)
      .populate('customer', 'customerName businessName phone address')
      .populate('employee', 'name email phone')
      .populate('approvedBy', 'name email')
      .exec();
  }

  async cancel(id: string, requestingUser: { _id: string; role: UserRole }) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (requestingUser.role === UserRole.EMPLOYEE) {
      if (order.employee.toString() !== requestingUser._id.toString()) {
        throw new ForbiddenException('You can only cancel your own orders');
      }
    }

    this.validateTransition(
      order.status,
      OrderStatus.CANCELLED,
      requestingUser.role,
    );

    order.status = OrderStatus.CANCELLED;

    const saved = await order.save();
    return this.orderModel
      .findById(saved._id)
      .populate('customer', 'customerName businessName phone address')
      .populate('employee', 'name email phone')
      .populate('approvedBy', 'name email')
      .exec();
  }
}
