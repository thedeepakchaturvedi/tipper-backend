import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  senderName: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  status: 'PENDING' | 'COMPLETED' | 'FAILED';

  @Prop()
  paymentId?: string;

  @Prop()
  errorMessage?: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
