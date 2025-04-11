import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTransactionDto {
  @ApiProperty({
    required: false,
    description: 'Ban status of the transaction',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isBanned?: boolean;

  @ApiProperty({
    required: false,
    description: 'Status of the transaction',
    example: 'completed',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    required: false,
    description: 'Error message for failed transactions',
    example: 'Payment failed due to insufficient funds',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
