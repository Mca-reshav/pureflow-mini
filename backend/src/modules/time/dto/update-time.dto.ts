import {
  IsString,
  IsOptional,
  IsInt,
  IsPositive,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTimeEntryDto {
  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  minutes?: number;

  @ApiPropertyOptional({ example: '2026-05-23' })
  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @ApiPropertyOptional({ example: 'Updated notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
