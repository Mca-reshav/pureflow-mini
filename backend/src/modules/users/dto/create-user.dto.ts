import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { password } from 'prisma/seed';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'john@pureflow.dev' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: password })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: Role, example: Role.ANALYST })
  @IsEnum(Role)
  role!: Role;
}
