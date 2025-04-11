import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'UUID of the user',
    example: 'oc-550e8400-e29b-41d4-a716-446655440000',
  })
  uuid: string;

  @ApiProperty({
    description: 'Name of the user',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Unique tipper ID',
    example: 'john123',
  })
  tipper_id: string;

  @ApiProperty({
    description: 'Whether tipping is enabled for the user',
    example: true,
  })
  tippingEnabled: boolean;

  @ApiProperty({
    description: 'Bank details of the user',
    example: {
      accountNumber: '1234567890',
      ifscCode: 'ABCD0001234',
      accountHolderName: 'John Doe',
      bankName: 'State Bank of India',
      isVerified: true,
      verificationStatus: 'VERIFIED',
      lastVerificationAttempt: '2024-03-20T10:00:00.000Z',
      verificationError: null,
    },
  })
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
    isVerified: boolean;
    verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
    lastVerificationAttempt: Date | null;
    verificationError: string | null;
  };

  @ApiProperty({
    type: 'object',
    properties: {
      picture: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          fileName: { type: 'string' },
        },
      },
      tipperPage: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          profileImage: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              fileName: { type: 'string' },
            },
          },
          coverImage: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              fileName: { type: 'string' },
            },
          },
          backgroundImage: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              fileName: { type: 'string' },
            },
          },
        },
      },
      streamLink: { type: 'string' },
    },
  })
  _metadata: {
    picture: {
      url: string;
      fileName: string;
    };
    tipperPage: {
      title: string;
      description: string;
      profileImage: {
        url: string;
        fileName: string;
      };
      coverImage: {
        url: string;
        fileName: string;
      };
      backgroundImage: {
        url: string;
        fileName: string;
      };
    };
    streamLink: string;
  } = {
    picture: {
      url: '',
      fileName: '',
    },
    tipperPage: {
      title: '',
      description: '',
      profileImage: {
        url: '',
        fileName: '',
      },
      coverImage: {
        url: '',
        fileName: '',
      },
      backgroundImage: {
        url: '',
        fileName: '',
      },
    },
    streamLink: '',
  };
}
