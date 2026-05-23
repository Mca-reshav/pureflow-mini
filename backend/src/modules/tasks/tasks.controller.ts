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
import { Role } from '@prisma/client';
import { TasksService } from './tasks.service';
import { AssignTaskDto, CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks' })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(
    @CurrentUser() user: { id: string; role: Role },
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.findAll(user.id, user.role, projectId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get tasks assigned' })
  findMyTasks(@CurrentUser() user: { id: string; role: Role }) {
    return this.tasksService.findMyTasks(user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task info' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.tasksService.findOne(id, user.id, user.role);
  }

  @Post()
  @Roles(Role.ADMIN, Role.BM)
  @ApiOperation({ summary: 'Create task' })
  create(@Body() dto: CreateTaskDto, @CurrentUser('id') userId: string) {
    return this.tasksService.create(dto, userId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.BM)
  @ApiOperation({ summary: 'Update task' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.tasksService.update(id, dto, user.id, user.role);
  }

  @Patch(':id/assign')
  @Roles(Role.ADMIN, Role.BM)
  @ApiOperation({ summary: 'Assign task to user' })
  assign(@Param('id') id: string, @Body() dto: AssignTaskDto) {
    return this.tasksService.assign(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.BM)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete task' })
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
