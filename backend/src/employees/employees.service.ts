// User instruction: "Phase 3: Employee Management - Create EmployeesModule with employees.service.ts"
// Importers/callers: employees.controller.ts, employees.module.ts
// Affected API: /api/employees endpoints (CRUD, status, pagination, search)
// Data schemas: User model (role: UserRole.EMPLOYEE), CreateEmployeeDto, UpdateEmployeeDto, UpdateStatusDto, QueryEmployeeDto

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/schemas/user.schema.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { QueryEmployeeDto } from './dto/query-employee.dto.js';

@Injectable()
export class EmployeesService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findAll(query: QueryEmployeeDto) {
    const { page = 1, limit = 10, search, isActive } = query;
    const filter: Record<string, any> = { role: UserRole.EMPLOYEE };

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string) {
    const employee = await this.userModel
      .findOne({ _id: id, role: UserRole.EMPLOYEE })
      .select('-passwordHash')
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async create(createEmployeeDto: CreateEmployeeDto) {
    const existing = await this.userModel
      .findOne({ email: createEmployeeDto.email.toLowerCase().trim() })
      .exec();

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(createEmployeeDto.password, 12);

    const employee = new this.userModel({
      name: createEmployeeDto.name.trim(),
      email: createEmployeeDto.email.toLowerCase().trim(),
      phone: createEmployeeDto.phone.trim(),
      passwordHash,
      role: UserRole.EMPLOYEE,
      isActive: true,
    });

    const saved = await employee.save();
    const result: Record<string, any> = saved.toJSON
      ? saved.toJSON()
      : { ...saved.toObject() };
    delete result.passwordHash;
    return result;
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    requestingUser: { _id: string; role: string },
  ) {
    const employee = await this.userModel
      .findOne({ _id: id, role: UserRole.EMPLOYEE })
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (requestingUser.role === UserRole.EMPLOYEE) {
      if (requestingUser._id.toString() !== id.toString()) {
        throw new ForbiddenException('You can only update your own profile');
      }

      if (
        updateEmployeeDto.email &&
        updateEmployeeDto.email.toLowerCase().trim() !== employee.email
      ) {
        throw new ForbiddenException(
          'Employees cannot change their email address',
        );
      }

      if (updateEmployeeDto.name) {
        employee.name = updateEmployeeDto.name.trim();
      }
      if (updateEmployeeDto.phone) {
        employee.phone = updateEmployeeDto.phone.trim();
      }
    } else if (requestingUser.role === UserRole.ADMIN) {
      if (
        updateEmployeeDto.email &&
        updateEmployeeDto.email.toLowerCase().trim() !== employee.email
      ) {
        const emailToTest = updateEmployeeDto.email.toLowerCase().trim();
        const existingEmail = await this.userModel
          .findOne({ email: emailToTest, _id: { $ne: id } })
          .exec();

        if (existingEmail) {
          throw new ConflictException(
            'Email is already in use by another account',
          );
        }
        employee.email = emailToTest;
      }

      if (updateEmployeeDto.name) {
        employee.name = updateEmployeeDto.name.trim();
      }
      if (updateEmployeeDto.phone) {
        employee.phone = updateEmployeeDto.phone.trim();
      }
    }

    const saved = await employee.save();
    const result: Record<string, any> = saved.toJSON
      ? saved.toJSON()
      : { ...saved.toObject() };
    delete result.passwordHash;
    return result;
  }

  async updateStatus(id: string, updateStatusDto: UpdateStatusDto) {
    const employee = await this.userModel
      .findOne({ _id: id, role: UserRole.EMPLOYEE })
      .exec();

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    employee.isActive = updateStatusDto.isActive;
    const saved = await employee.save();
    const result: Record<string, any> = saved.toJSON
      ? saved.toJSON()
      : { ...saved.toObject() };
    delete result.passwordHash;
    return result;
  }
}
