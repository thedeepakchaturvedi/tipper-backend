import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID', example: 'user123' })
  _id: string;

  @ApiProperty({ description: 'User name', example: 'John Doe' })
  name: string;

  @ApiProperty({ description: 'User email', example: 'john@example.com' })
  email: string;

  @ApiProperty({ description: 'User tipper ID', example: 'tipper123' })
  tipper_id: string;

  @ApiProperty({ description: 'Whether tipping is enabled', example: true })
  tippingEnabled: boolean;

  @ApiProperty({
    description: 'Bank details verification status',
    example: {
      isVerified: true,
      verificationStatus: 'VERIFIED',
      lastVerificationAttempt: '2024-03-20T10:30:00.000Z',
    },
  })
  bankDetails: {
    isVerified: boolean;
    verificationStatus: string;
    lastVerificationAttempt: Date | null;
  };
}
