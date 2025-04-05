import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SupportedCurrencies } from 'src/users/dto/supported-currencies.dto';

export class DashboardParamsDto {
  @ApiProperty({
    description: 'Base currency for amount conversion',
    enum: Object.values(SupportedCurrencies),
    enumName: 'SupportedCurrencies',
    default: SupportedCurrencies.INR,
    required: false,
    example: SupportedCurrencies.INR,
  })
  @IsEnum(SupportedCurrencies)
  @IsOptional()
  baseCurrency: SupportedCurrencies = SupportedCurrencies.INR;

  @ApiProperty({
    description: 'Number of recent transactions to return',
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
    example: 10,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  recentTransactionsLimit: number = 10;
}
