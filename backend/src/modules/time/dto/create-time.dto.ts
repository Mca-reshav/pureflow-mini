import {
  IsString,
  IsOptional,
  IsInt,
  IsPositive,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTimeEntryDto {
  @ApiProperty({ example: 'seed-task-001' })
  @IsString()
  taskId!: string;

  @ApiProperty({ example: 90, description: 'Minutes spent' })
  @IsInt()
  @IsPositive()
  minutes!: number;

  @ApiProperty({ example: '2026-05-23', description: 'Date of completion' })
  @IsDateString()
  entryDate!: string;

  @ApiPropertyOptional({ example: 'your remarks' })
  @IsOptional()
  @IsString()
  notes?: string;
}
