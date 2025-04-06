import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Updated name of the user',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Unique tipper ID for the user (can only be set once)',
    example: 'john123',
    required: false,
  })
  @IsString()
  @IsOptional()
  tipper_id?: string;

  @ApiProperty({
    description: 'Bank account number',
    example: '1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiProperty({
    description: 'Bank IFSC code',
    example: 'ABCD0001234',
    required: false,
  })
  @IsString()
  @IsOptional()
  ifscCode?: string;

  @ApiProperty({
    description: 'Name of the bank account holder',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  accountHolderName?: string;

  @ApiProperty({
    description: 'Name of the bank',
    example: 'State Bank of India',
    required: false,
  })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiProperty({
    description: 'Whether tipping is enabled for the user',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  tippingEnabled?: boolean;
}
