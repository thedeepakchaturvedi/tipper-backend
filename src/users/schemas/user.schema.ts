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

  @Prop({ default: null })
  phone: string;

  @Prop({ unique: true, sparse: true })
  tipper_id?: string;

  @Prop({ default: false })
  isTipperIdSet: boolean;

  @Prop({ required: true })
  userHash: string;

  @Prop({ default: false })
  tippingEnabled: boolean;

  @Prop({ default: '' })
  razorpay_account_id: string;

  @Prop({ default: '' })
  razorpay_product_id: string;

  @Prop({ default: '' })
  razorpay_activation_status: string;

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
    type: Object,
    default: {
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
  };

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
