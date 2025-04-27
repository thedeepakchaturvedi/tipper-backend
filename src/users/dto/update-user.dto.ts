import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsPhoneNumber,
} from 'class-validator';
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

  // add phone number field
  @ApiProperty({
    description: 'Phone number of the user',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber(null)
  phone?: string;

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

  @ApiProperty({
    required: false,
    description: 'User metadata',
    example: {
      picture: {
        url: 'https://example.com/picture.jpg',
        fileName: 'profile-picture.jpg',
      },
      tipperPage: {
        title: 'My Tipper Page',
        description: 'Welcome to my page!',
        profileImage: {
          url: 'https://example.com/profile.jpg',
          fileName: 'profile-image.jpg',
        },
        coverImage: {
          url: 'https://example.com/cover.jpg',
          fileName: 'cover-image.jpg',
        },
        backgroundImage: {
          url: 'https://example.com/background.jpg',
          fileName: 'background-image.jpg',
        },
      },
      streamLink: 'https://example.com/stream-link',
    },
  })
  @IsOptional()
  @IsObject()
  _metadata?: {
    picture?: {
      url?: string;
      fileName?: string;
    };
    tipperPage?: {
      title?: string;
      description?: string;
      profileImage?: {
        url?: string;
        fileName?: string;
      };
      coverImage?: {
        url?: string;
        fileName?: string;
      };
      backgroundImage?: {
        url?: string;
        fileName?: string;
      };
    };
    streamLink?: string;
  };
}
