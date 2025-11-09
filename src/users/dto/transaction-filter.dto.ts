import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsDateString,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SupportedCurrencies } from './supported-currencies.dto';

export enum TransactionStatus {
  PENDING = 'order created',
  COMPLETED = 'completed',
  FAILED = 'FAILED',
}

export enum TransactionSortBy {
  CREATED_AT = 'createdAt',
  AMOUNT = 'amount',
  STATUS = 'status',
  CURRENCY = 'currency',
}

export class TransactionFilterDto {
  @ApiProperty({
    description: 'Filter by transaction status',
    enum: TransactionStatus,
    required: false,
    example: TransactionStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiProperty({
    description: 'Filter by currency',
    enum: Object.values(SupportedCurrencies),
    required: false,
    example: SupportedCurrencies.INR,
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Sort by property',
    required: false,
    example: TransactionSortBy.CREATED_AT,
    default: TransactionSortBy.CREATED_AT,
    enum: Object.values(TransactionSortBy),
  })
  @IsOptional()
  @IsEnum(TransactionSortBy)
  sortBy?: TransactionSortBy = TransactionSortBy.CREATED_AT;

  @ApiProperty({
    description: 'Sort order',
    required: false,
    example: 'desc',
    default: 'asc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';


  @ApiProperty({
    description: 'Minimum transaction amount',
    required: false,
    minimum: 0,
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiProperty({
    description: 'Maximum transaction amount',
    required: false,
    minimum: 0,
    example: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiProperty({
    required: false,
    description: 'Filter transactions after this date (ISO format)',
    example: '2024-03-20T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  afterDate?: string;

  @ApiProperty({
    required: false,
    description: 'Include banned transactions in the results',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeBanned?: boolean;
}
