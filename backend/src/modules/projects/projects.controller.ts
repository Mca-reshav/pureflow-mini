import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { AddMemberDto, CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { ProjectMemberGuard } from '../../guards/project-member.guard';

@ApiTags('projects')
@ApiBearerAuth('access-token')
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List projects' })
  findAll(@CurrentUser() user: { id: string; role: Role }) {
    return this.projectsService.findAll(user.id, user.role);
  }

  @Get(':id')
  @UseGuards(ProjectMemberGuard)
  @ApiOperation({ summary: 'Get project detail' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.BM)
  @ApiOperation({ summary: 'Create project' })
  create(@Body() dto: CreateProjectDto, @CurrentUser('id') userId: string) {
    return this.projectsService.create(dto, userId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.BM)
  @UseGuards(ProjectMemberGuard)
  @ApiOperation({ summary: 'Update project' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive project' })
  archive(@Param('id') id: string) {
    return this.projectsService.archive(id);
  }

  @Post(':id/member')
  @Roles(Role.ADMIN, Role.BM)
  @ApiOperation({ summary: 'Add member to project' })
  addMember(
    @Param('id') projectId: string,
    @Body() dto: AddMemberDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.projectsService.addMember(projectId, dto, actorId);
  }

  @Delete(':id/member/:userId')
  @Roles(Role.ADMIN, Role.BM)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove member from project' })
  removeMember(
    @Param('id') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.projectsService.removeMember(projectId, userId);
  }
}
