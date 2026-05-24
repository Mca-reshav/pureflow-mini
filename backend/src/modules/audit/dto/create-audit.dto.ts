import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAuditDto {
  @ApiPropertyOptional({ example: 'tasks' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ example: 'tasks.created' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: '50' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ example: '0' })
  @IsOptional()
  @IsString()
  offset?: string;
}
