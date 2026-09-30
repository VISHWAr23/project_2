// User instruction: "Phase 4: Customer Management - Create CustomersService with RBAC enforcement, employee validation, and ownership checks"
// Importers/callers: customers.controller.ts, customers.module.ts
// Affected API: /api/customers endpoints with full CRUD, ADMIN can manage all, EMPLOYEE sees only assigned customers
// Data schemas: Customer, User, CreateCustomerDto, UpdateCustomerDto, UpdateStatusDto, QueryCustomerDto

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerStatus } from './schemas/customer.schema.js';
import { User, UserRole } from '../users/schemas/user.schema.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { QueryCustomerDto } from './dto/query-customer.dto.js';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async findAll(
    query: QueryCustomerDto,
    requestingUser: { _id: string; role: string },
  ) {
    const { page = 1, limit = 10, search, status, employeeId } = query;
    const filter: Record<string, any> = {};

    // EMPLOYEE can only see their own customers
    if (requestingUser.role === UserRole.EMPLOYEE) {
      filter.assignedEmployee = new Types.ObjectId(requestingUser._id);
    } else if (requestingUser.role === UserRole.ADMIN && employeeId) {
      // ADMIN can filter by employeeId
      filter.assignedEmployee = new Types.ObjectId(employeeId);
    }

    if (status) {
      filter.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { customerName: searchRegex },
        { businessName: searchRegex },
        { phone: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.customerModel
        .find(filter)
        .populate('assignedEmployee', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.customerModel.countDocuments(filter).exec(),
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
    const customer = await this.customerModel
      .findById(id)
      .populate('assignedEmployee', 'name email phone')
      .exec();

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // EMPLOYEE can only access their assigned customers
    if (requestingUser.role === UserRole.EMPLOYEE) {
      if (
        customer.assignedEmployee._id.toString() !==
        requestingUser._id.toString()
      ) {
        throw new ForbiddenException(
          'You can only access your assigned customers',
        );
      }
    }

    return customer;
  }

  async create(
    createCustomerDto: CreateCustomerDto,
    requestingUser: { _id: string; role: string },
  ) {
    // Determine the assigned employee
    let assignedEmployeeId = createCustomerDto.assignedEmployee;

    // If EMPLOYEE is creating, auto-assign to themselves
    if (requestingUser.role === UserRole.EMPLOYEE) {
      assignedEmployeeId = requestingUser._id;
    }

    // Validate assigned employee
    const employee = await this.userModel.findById(assignedEmployeeId).exec();

    if (!employee) {
      throw new BadRequestException('Assigned employee does not exist');
    }

    if (employee.role !== UserRole.EMPLOYEE) {
      throw new BadRequestException(
        'Assigned user must be an EMPLOYEE, not an ADMIN',
      );
    }

    if (!employee.isActive) {
      throw new BadRequestException(
        'Cannot assign customer to inactive employee',
      );
    }

    const customer = new this.customerModel({
      customerName: createCustomerDto.customerName.trim(),
      businessName: createCustomerDto.businessName.trim(),
      phone: createCustomerDto.phone.trim(),
      address: createCustomerDto.address.trim(),
      assignedEmployee: new Types.ObjectId(assignedEmployeeId),
      status: CustomerStatus.ACTIVE,
    });

    const saved = await customer.save();
    return this.customerModel
      .findById(saved._id)
      .populate('assignedEmployee', 'name email')
      .exec();
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    requestingUser: { _id: string; role: string },
  ) {
    const customer = await this.customerModel.findById(id).exec();

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // EMPLOYEE can only update their assigned customers
    if (requestingUser.role === UserRole.EMPLOYEE) {
      if (
        customer.assignedEmployee.toString() !== requestingUser._id.toString()
      ) {
        throw new ForbiddenException(
          'You can only update your assigned customers',
        );
      }

      // EMPLOYEE cannot reassign customers
      if (updateCustomerDto.assignedEmployee) {
        throw new ForbiddenException('Employees cannot reassign customers');
      }
    }

    // ADMIN can reassign, validate new employee
    if (
      requestingUser.role === UserRole.ADMIN &&
      updateCustomerDto.assignedEmployee &&
      updateCustomerDto.assignedEmployee !==
        customer.assignedEmployee.toString()
    ) {
      const newEmployee = await this.userModel
        .findById(updateCustomerDto.assignedEmployee)
        .exec();

      if (!newEmployee) {
        throw new BadRequestException('New assigned employee does not exist');
      }

      if (newEmployee.role !== UserRole.EMPLOYEE) {
        throw new BadRequestException(
          'Assigned user must be an EMPLOYEE, not an ADMIN',
        );
      }

      if (!newEmployee.isActive) {
        throw new BadRequestException(
          'Cannot assign customer to inactive employee',
        );
      }

      customer.assignedEmployee = new Types.ObjectId(
        updateCustomerDto.assignedEmployee,
      );
    }

    if (updateCustomerDto.customerName) {
      customer.customerName = updateCustomerDto.customerName.trim();
    }
    if (updateCustomerDto.businessName) {
      customer.businessName = updateCustomerDto.businessName.trim();
    }
    if (updateCustomerDto.phone) {
      customer.phone = updateCustomerDto.phone.trim();
    }
    if (updateCustomerDto.address) {
      customer.address = updateCustomerDto.address.trim();
    }

    const saved = await customer.save();
    return this.customerModel
      .findById(saved._id)
      .populate('assignedEmployee', 'name email')
      .exec();
  }

  async updateStatus(id: string, updateStatusDto: UpdateStatusDto) {
    const customer = await this.customerModel.findById(id).exec();

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    customer.status = updateStatusDto.status;
    const saved = await customer.save();
    return this.customerModel
      .findById(saved._id)
      .populate('assignedEmployee', 'name email')
      .exec();
  }
}
