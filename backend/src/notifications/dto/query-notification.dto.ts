import { IsOptional, IsNumberString, IsBooleanString } from 'class-validator';

export class QueryNotificationDto {
  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  @IsBooleanString()
  isRead?: string;
}
