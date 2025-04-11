import { ApiProperty } from '@nestjs/swagger';

export class TipResponseDto {
  @ApiProperty({ description: 'Transaction ID', example: 'txn123' })
  _id: string;

  @ApiProperty({ description: 'Tip amount', example: 100 })
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'INR' })
  currency: string;

  @ApiProperty({ description: 'Sender name', example: 'John Doe' })
  senderName: string;

  @ApiProperty({ description: 'Message from the sender', nullable: true })
  message: string | null;

  @ApiProperty({
    description: 'Transaction status',
    enum: ['COMPLETED', 'FAILED', 'PENDING'],
    example: 'COMPLETED',
  })
  status: string;

  @ApiProperty({
    description: 'Payment ID (if available)',
    example: 'pay_123',
    required: false,
  })
  paymentId?: string;

  @ApiProperty({
    description: 'Error message (if failed)',
    example: 'Payment failed',
    required: false,
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-03-20T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-03-20T10:30:00.000Z',
  })
  updatedAt: Date;
}
