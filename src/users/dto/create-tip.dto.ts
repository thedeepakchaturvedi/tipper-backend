import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SupportedCurrencies } from './supported-currencies.dto';

export class CreateTipDto {
  @ApiProperty({
    description: 'Tip amount (minimum 1)',
    example: 100,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Name of the person sending the tip',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  senderName: string;

  @ApiProperty({
    description: 'Currency code for the tip amount',
    enum: Object.values(SupportedCurrencies),
    example: SupportedCurrencies.INR,
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Optional message with the tip',
    example: 'Great work!',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
