import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Capitalise, Lowercase, Trim } from 'src/common/decorators';

class CertificateDto {
  @IsEmail()
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

  @IsBoolean()
  sendEmail: boolean;

  @IsBoolean()
  sendOnlyEmail: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificateDto)
  certificates: CertificateDto[];
}
