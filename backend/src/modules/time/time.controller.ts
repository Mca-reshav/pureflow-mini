import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TimeService } from './time.service';
import { CreateTimeEntryDto } from './dto/create-time.dto';
import { UpdateTimeEntryDto } from './dto/update-time.dto';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('time')
@ApiBearerAuth('access-token')
@Controller('time')
export class TimeController {
  constructor(private timeService: TimeService) {}

  @Get()
  @ApiOperation({ summary: 'List time entries' })
  @ApiQuery({ name: 'task_id', required: false })
  findAll(
    @CurrentUser() user: { id: string; role: Role },
    @Query('task_id') taskId?: string,
  ) {
    return this.timeService.findAll(user.id, user.role, taskId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Time entry with version' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.timeService.findOne(id, user.id, user.role);
  }

  @Post()
  @ApiOperation({ summary: 'Add time entry' })
  create(
    @Body() dto: CreateTimeEntryDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.timeService.create(dto, user.id, user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit time entry' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTimeEntryDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.timeService.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete time entry' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.timeService.remove(id, user.id, user.role);
  }
}
