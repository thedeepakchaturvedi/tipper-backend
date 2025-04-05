import { ApiProperty } from '@nestjs/swagger';

export class TransactionSummary {
  @ApiProperty({
    description: 'Total amount of all completed transactions in base currency',
    example: 1000.5,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Base currency used for amount conversion',
    example: 'INR',
  })
  baseCurrency: string;

  @ApiProperty({
    description: 'Total number of transactions (including all statuses)',
    example: 25,
  })
  transactionCount: number;

  @ApiProperty({
    description: 'Number of successfully completed transactions',
    example: 20,
  })
  successfulCount: number;

  @ApiProperty({
    description: 'Number of failed transactions',
    example: 3,
  })
  failedCount: number;

  @ApiProperty({
    description: 'Number of pending transactions',
    example: 2,
  })
  pendingCount: number;

  @ApiProperty({
    description: 'Average amount of completed transactions in base currency',
    example: 50.25,
  })
  averageAmount: number;

  @ApiProperty({
    description: 'Breakdown of transactions by currency',
    example: {
      INR: {
        amount: 5000,
        count: 10,
        convertedAmount: 5000,
      },
      USD: {
        amount: 100,
        count: 5,
        convertedAmount: 7500,
      },
    },
  })
  currencyBreakdown: {
    [currency: string]: {
      amount: number;
      count: number;
      convertedAmount: number;
    };
  };
}

export class RecentTransaction {
  @ApiProperty({
    description: 'Transaction amount in original currency',
    example: 100,
  })
  amount: number;

  @ApiProperty({
    description: 'Original currency of the transaction',
    example: 'INR',
  })
  currency: string;

  @ApiProperty({
    description: 'Converted amount in base currency',
    example: 100,
  })
  convertedAmount: number;

  @ApiProperty({
    description: 'Transaction status',
    example: 'COMPLETED',
    enum: ['COMPLETED', 'FAILED', 'PENDING'],
  })
  status: string;

  @ApiProperty({
    description: 'Transaction creation timestamp',
    example: '2024-03-20T10:30:00.000Z',
  })
  createdAt: Date;
}

export class DashboardResponse {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: 'user123',
  })
  userId: string;

  @ApiProperty({
    description: 'Name of the user',
    example: 'John Doe',
  })
  userName: string;

  @ApiProperty({
    description: 'Summary of all transactions',
  })
  summary: TransactionSummary;

  @ApiProperty({
    description: 'List of recent transactions',
    type: [RecentTransaction],
  })
  recentTransactions: RecentTransaction[];
}
