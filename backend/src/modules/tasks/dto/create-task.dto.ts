import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ example: 'clx123abc' })
  @IsString()
  projectId!: string;

  @ApiProperty({ example: 'Some title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Some task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskPriority, example: TaskPriority.medium })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 'clx123abc' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ example: 120, description: 'Expected minutes' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  expectedMinutes?: number;

  @ApiPropertyOptional({ example: '2026-05-25' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class AssignTaskDto {
  @ApiProperty({ example: 'clx123abc' })
  @IsString()
  assigneeId!: string;
}
