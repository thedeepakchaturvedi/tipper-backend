import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true })
  tipper_id: string;

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

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
