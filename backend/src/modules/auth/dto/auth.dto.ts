import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { emailObj, passwordObj } from 'prisma/seed.data';

export class LoginDto {
  @ApiProperty({ example: emailObj.admin })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: passwordObj.admin })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class RefreshDto {}
