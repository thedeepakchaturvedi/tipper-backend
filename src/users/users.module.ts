import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PaymentGatewayService } from './services/payment-gateway.service';
import { CurrencyConversionService } from './services/currency-conversion.service';
import { RazorpayService } from './services/razorpay.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    PaymentGatewayService,
    CurrencyConversionService,
    RazorpayService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
