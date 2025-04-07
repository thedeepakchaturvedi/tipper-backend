import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
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

  @ApiProperty({
    description: 'User metadata including profile and tipper page details',
    example: {
      picture: 'https://example.com/picture.jpg',
      tipperPage: {
        title: 'My Tipper Page',
        description: 'Welcome to my page!',
        profileImage: 'https://example.com/profile.jpg',
        coverImage: 'https://example.com/cover.jpg',
        backgroundImage: 'https://example.com/background.jpg',
      },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  _metadata?: {
    picture?: string;
    tipperPage?: {
      title?: string;
      description?: string;
      profileImage?: string;
      coverImage?: string;
      backgroundImage?: string;
    };
  };
}
