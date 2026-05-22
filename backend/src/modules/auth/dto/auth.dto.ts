import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { emailObj, password } from 'prisma/seed';

export class LoginDto {
  @ApiProperty({ example: emailObj.admin })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: password })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class RefreshDto {}