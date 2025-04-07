import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  uuid: string;

  @Prop()
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ unique: true, sparse: true })
  tipper_id?: string;

  @Prop({ default: false })
  isTipperIdSet: boolean;

  @Prop({ required: true })
  userHash: string;

  @Prop({ default: false })
  tippingEnabled: boolean;

  @Prop({
    type: {
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      bankName: { type: String, default: '' },
      isVerified: { type: Boolean, default: false },
      verificationStatus: { type: String, default: 'PENDING' }, // PENDING, VERIFIED, FAILED
      lastVerificationAttempt: { type: Date, default: null },
      verificationError: { type: String, default: null },
    },
    default: {},
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

  @Prop({
    type: {
      picture: { type: String, default: '' },
      tipperPage: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        profileImage: { type: String, default: '' },
        coverImage: { type: String, default: '' },
        backgroundImage: { type: String, default: '' },
      },
    },
    default: {},
  })
  _metadata: {
    picture: string;
    tipperPage: {
      title: string;
      description: string;
      profileImage: string;
      coverImage: string;
      backgroundImage: string;
    };
  };

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create index for uuid
UserSchema.index({ uuid: 1 }, { unique: true });
