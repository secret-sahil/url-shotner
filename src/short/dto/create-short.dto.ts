import { IsUrl } from 'class-validator';

export class CreateShortDto {
  @IsUrl()
  originalUrl: string;
}
