import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFormat } from '@prisma/client';

export class CreateReportDto {
  @ApiPropertyOptional({ example: 'seed-project-001' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ example: '2026-05-24' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-06-25' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({ enum: ReportFormat, default: ReportFormat.csv })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.csv;
}
