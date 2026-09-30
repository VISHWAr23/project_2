// User instruction: "Phase 5: Customer Visit Management - Create VisitsController with RBAC guards"
// Importers/callers: visits.module.ts
// Affected API: /api/visits (GET list, GET by id, POST create, PATCH update)
// Data schemas: Visit, CreateVisitDto, UpdateVisitDto, QueryVisitDto

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { VisitsService } from './visits.service.js';
import { CreateVisitDto } from './dto/create-visit.dto.js';
import { UpdateVisitDto } from './dto/update-visit.dto.js';
import { QueryVisitDto } from './dto/query-visit.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe.js';

@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get()
  async findAll(@Query() query: QueryVisitDto, @CurrentUser() user: any) {
    return this.visitsService.findAll(query, user);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.visitsService.findById(id, user);
  }

  @Post()
  async create(
    @Body() createVisitDto: CreateVisitDto,
    @CurrentUser() user: any,
  ) {
    return this.visitsService.create(createVisitDto, user);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() updateVisitDto: UpdateVisitDto,
    @CurrentUser() user: any,
  ) {
    return this.visitsService.update(id, updateVisitDto, user);
  }
}
