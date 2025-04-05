import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

@Module({
  imports: [MongooseModule.forRoot(process.env.DATABASE_URL)],
})
export class DatabaseModule {}
