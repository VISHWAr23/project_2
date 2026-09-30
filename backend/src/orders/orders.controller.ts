// User instruction: "Phase 6: Order Management - Create OrdersController"
// Importers/callers: orders.module.ts
// Affected API: /api/orders (findAll, findOne, create, update, approve, reject, complete, cancel)
// Data schemas: Order, CreateOrderDto, UpdateOrderDto, QueryOrderDto, RejectOrderDto

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { QueryOrderDto } from './dto/query-order.dto.js';
import { RejectOrderDto } from './dto/reject-order.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe.js';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll(@Query() query: QueryOrderDto, @CurrentUser() user: any) {
    return this.ordersService.findAll(query, user);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.findById(id, user);
  }

  @Post()
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.create(createOrderDto, user);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.update(id, updateOrderDto, user);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  async approve(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.approve(id, user);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN)
  async reject(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() rejectOrderDto: RejectOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.reject(id, rejectOrderDto, user);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN)
  async complete(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.complete(id, user);
  }

  @Patch(':id/cancel')
  async cancel(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.cancel(id, user);
  }
}
