import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Capitalise, Lowercase, Trim } from 'src/common/decorators';

class CertificateDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail(
    {},
    {
      message: ({ value }) =>
        value ? `${value} is not a valid email address` : 'Email is invalid',
    },
  )
  @Trim()
  @Lowercase()
  email: string;

  @IsString()
  @Trim()
  @Capitalise()
  name: string;

  @IsString()
  @Trim()
  @Capitalise()
  course: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsOptional()
  @IsString()
  grades?: string;
}

export class CreateCertificateDto {
  @IsString()
  template: string;

  @IsString()
  password: string;

  @IsBoolean()
  sendEmail: boolean;

  @IsBoolean()
  saveToDatabase: boolean;

  @IsBoolean()
  sendOnlyEmail: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificateDto)
  certificates: CertificateDto[];
}
