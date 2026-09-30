// User instruction: "Phase 5: Customer Visit Management - Create VisitsService with strict ownership and business rules"
// Importers/callers: visits.controller.ts, customers.controller.ts, visits.module.ts
// Affected API: /api/visits, /api/customers/:customerId/visits
// Data schemas: Visit, Customer, User, CreateVisitDto, UpdateVisitDto, QueryVisitDto

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Visit } from './schemas/visit.schema.js';
import { Customer } from '../customers/schemas/customer.schema.js';
import { User, UserRole } from '../users/schemas/user.schema.js';
import { CreateVisitDto } from './dto/create-visit.dto.js';
import { UpdateVisitDto } from './dto/update-visit.dto.js';
import { QueryVisitDto } from './dto/query-visit.dto.js';

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel(Visit.name) private visitModel: Model<Visit>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async findAll(
    query: QueryVisitDto,
    requestingUser: { _id: string; role: string },
  ) {
    const {
      page = 1,
      limit = 10,
      employeeId,
      customerId,
      startDate,
      endDate,
    } = query;
    const filter: Record<string, any> = {};

    // Strict RBAC: Employees can ONLY view their own visits
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

    // Date range filtering on visitDate
    if (startDate || endDate) {
      filter.visitDate = {};
      if (startDate) {
        filter.visitDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.visitDate.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.visitModel
        .find(filter)
        .populate('customer', 'customerName businessName phone address')
        .populate('employee', 'name email phone')
        .sort({ visitDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.visitModel.countDocuments(filter).exec(),
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
    const visit = await this.visitModel
      .findById(id)
      .populate('customer', 'customerName businessName phone address')
      .populate('employee', 'name email phone')
      .exec();

    if (!visit) {
      throw new NotFoundException('Visit not found');
    }

    if (requestingUser.role === UserRole.EMPLOYEE) {
      const employeeObjId = (visit.employee as any)._id || visit.employee;
      if (employeeObjId.toString() !== requestingUser._id.toString()) {
        throw new ForbiddenException('You can only access your own visits');
      }
    }

    return visit;
  }

  async create(
    createVisitDto: CreateVisitDto,
    requestingUser: { _id: string; role: string },
  ) {
    // 1. Verify customer exists
    const customer = await this.customerModel
      .findById(createVisitDto.customer)
      .exec();
    if (!customer) {
      throw new BadRequestException('Customer does not exist');
    }

    // 2. Determine and validate assigned employee
    let employeeId = createVisitDto.employee;

    if (requestingUser.role === UserRole.EMPLOYEE) {
      employeeId = requestingUser._id;

      // Ensure customer is assigned to this employee
      if (
        customer.assignedEmployee.toString() !== requestingUser._id.toString()
      ) {
        throw new ForbiddenException(
          'You can only create visits for your assigned customers',
        );
      }

      // Ensure employee is active
      const currentEmployee = await this.userModel
        .findById(requestingUser._id)
        .exec();
      if (
        !currentEmployee ||
        !currentEmployee.isActive ||
        currentEmployee.role !== UserRole.EMPLOYEE
      ) {
        throw new BadRequestException('Inactive employee cannot create visits');
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
        throw new BadRequestException(
          'Assigned user must be an EMPLOYEE, not an ADMIN',
        );
      }
      if (!targetEmployee.isActive) {
        throw new BadRequestException(
          'Cannot assign visit to inactive employee',
        );
      }
    }

    // 3. Date validation
    const visitDate = new Date(createVisitDto.visitDate);
    if (isNaN(visitDate.getTime())) {
      throw new BadRequestException('Invalid visit date');
    }

    let followUpDate: Date | undefined;
    if (createVisitDto.followUpDate) {
      followUpDate = new Date(createVisitDto.followUpDate);
      if (isNaN(followUpDate.getTime())) {
        throw new BadRequestException('Invalid follow-up date');
      }
      if (followUpDate < visitDate) {
        throw new BadRequestException(
          'Follow-up date cannot be earlier than visit date',
        );
      }
    }

    // 4. GPS validation
    if (createVisitDto.latitude !== undefined) {
      if (
        typeof createVisitDto.latitude !== 'number' ||
        isNaN(createVisitDto.latitude) ||
        createVisitDto.latitude < -90 ||
        createVisitDto.latitude > 90
      ) {
        throw new BadRequestException('Latitude must be between -90 and 90');
      }
    }

    if (createVisitDto.longitude !== undefined) {
      if (
        typeof createVisitDto.longitude !== 'number' ||
        isNaN(createVisitDto.longitude) ||
        createVisitDto.longitude < -180 ||
        createVisitDto.longitude > 180
      ) {
        throw new BadRequestException('Longitude must be between -180 and 180');
      }
    }

    // 5. Create and persist visit
    const visit = new this.visitModel({
      customer: new Types.ObjectId(customer._id),
      employee: new Types.ObjectId(employeeId),
      visitDate,
      purpose: createVisitDto.purpose.trim(),
      notes: createVisitDto.notes ? createVisitDto.notes.trim() : undefined,
      result: createVisitDto.result.trim(),
      followUpDate,
      photoUrl: createVisitDto.photoUrl
        ? createVisitDto.photoUrl.trim()
        : undefined,
      latitude: createVisitDto.latitude,
      longitude: createVisitDto.longitude,
    });

    const saved = await visit.save();
    return this.visitModel
      .findById(saved._id)
      .populate('customer', 'customerName businessName phone address')
      .populate('employee', 'name email phone')
      .exec();
  }

  async update(
    id: string,
    updateVisitDto: UpdateVisitDto,
    requestingUser: { _id: string; role: string },
  ) {
    const visit = await this.visitModel.findById(id).exec();
    if (!visit) {
      throw new NotFoundException('Visit not found');
    }

    // Strict RBAC: Employee can only update their own visits
    if (requestingUser.role === UserRole.EMPLOYEE) {
      if (visit.employee.toString() !== requestingUser._id.toString()) {
        throw new ForbiddenException('You can only modify your own visits');
      }
    }

    // Date validations
    const newVisitDate = updateVisitDto.visitDate
      ? new Date(updateVisitDto.visitDate)
      : visit.visitDate;

    if (updateVisitDto.visitDate && isNaN(newVisitDate.getTime())) {
      throw new BadRequestException('Invalid visit date');
    }

    if (updateVisitDto.followUpDate) {
      const newFollowUpDate = new Date(updateVisitDto.followUpDate);
      if (isNaN(newFollowUpDate.getTime())) {
        throw new BadRequestException('Invalid follow-up date');
      }
      if (newFollowUpDate < newVisitDate) {
        throw new BadRequestException(
          'Follow-up date cannot be earlier than visit date',
        );
      }
      visit.followUpDate = newFollowUpDate;
    }

    // GPS validations
    if (updateVisitDto.latitude !== undefined) {
      if (
        typeof updateVisitDto.latitude !== 'number' ||
        isNaN(updateVisitDto.latitude) ||
        updateVisitDto.latitude < -90 ||
        updateVisitDto.latitude > 90
      ) {
        throw new BadRequestException('Latitude must be between -90 and 90');
      }
      visit.latitude = updateVisitDto.latitude;
    }

    if (updateVisitDto.longitude !== undefined) {
      if (
        typeof updateVisitDto.longitude !== 'number' ||
        isNaN(updateVisitDto.longitude) ||
        updateVisitDto.longitude < -180 ||
        updateVisitDto.longitude > 180
      ) {
        throw new BadRequestException('Longitude must be between -180 and 180');
      }
      visit.longitude = updateVisitDto.longitude;
    }

    if (updateVisitDto.visitDate) visit.visitDate = newVisitDate;
    if (updateVisitDto.purpose !== undefined)
      visit.purpose = updateVisitDto.purpose.trim();
    if (updateVisitDto.notes !== undefined)
      visit.notes = updateVisitDto.notes.trim();
    if (updateVisitDto.result !== undefined)
      visit.result = updateVisitDto.result.trim();
    if (updateVisitDto.photoUrl !== undefined)
      visit.photoUrl = updateVisitDto.photoUrl.trim();

    const saved = await visit.save();
    return this.visitModel
      .findById(saved._id)
      .populate('customer', 'customerName businessName phone address')
      .populate('employee', 'name email phone')
      .exec();
  }

  async findByCustomer(
    customerId: string,
    requestingUser: { _id: string; role: string },
  ) {
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // If EMPLOYEE, verify customer is assigned to them
    if (requestingUser.role === UserRole.EMPLOYEE) {
      if (
        customer.assignedEmployee.toString() !== requestingUser._id.toString()
      ) {
        throw new ForbiddenException(
          'You can only view visits for your assigned customers',
        );
      }
    }

    return this.visitModel
      .find({ customer: new Types.ObjectId(customerId) })
      .populate('employee', 'name email phone')
      .sort({ visitDate: -1, createdAt: -1 })
      .exec();
  }
}
