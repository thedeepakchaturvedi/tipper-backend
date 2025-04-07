import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { InjectConnection } from '@nestjs/mongoose';
import { CreateTipDto } from './dto/create-tip.dto';
import { PaymentGatewayService } from './services/payment-gateway.service';
import { CurrencyConversionService } from './services/currency-conversion.service';
import { DashboardResponse, TransactionSummary } from './dto/dashboard.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { DashboardParamsDto } from './dto/dashboard-params.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { TipResponseDto } from './dto/tip-response.dto';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

interface MongoError extends Error {
  code: number;
}

interface TransactionDocument {
  _id: ObjectId;
  amount: number;
  currency: string;
  senderName: string;
  status: string;
  paymentId?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserResponse {
  _id: any; // MongoDB _id can be ObjectId or string
  name: string;
  email: string;
  tipper_id: string;
  tippingEnabled: boolean;
  bankDetails: {
    isVerified: boolean;
    verificationStatus: string;
    lastVerificationAttempt: Date | null;
  };
}

export interface TipResponse {
  _id: any;
  amount: number;
  currency: string;
  senderName: string;
  status: string;
  paymentId?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Transaction {
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
}

interface TransactionQuery {
  status?: string;
  currency?: string;
  amount?: {
    $gte?: number;
    $lte?: number;
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private connection: Connection,
    private paymentGatewayService: PaymentGatewayService,
    private currencyConversionService: CurrencyConversionService,
  ) {}

  private sanitizeUserResponse(user: UserDocument): UserResponseDto {
    return {
      _id: (user._id as Types.ObjectId).toString(),
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      tipper_id: user.tipper_id,
      tippingEnabled: user.tippingEnabled,
      bankDetails: user.bankDetails,
      _metadata: user._metadata,
    };
  }

  private async createTransactionCollection(tipper_id: string): Promise<void> {
    const collectionName = `${tipper_id}.transactions`;
    const collections = await this.connection.db.listCollections().toArray();
    const collectionExists = collections.some(
      (col) => col.name === collectionName,
    );

    if (!collectionExists) {
      await this.connection.db.createCollection(collectionName);
      // Create indexes for better query performance
      await this.connection.db
        .collection(collectionName)
        .createIndexes([{ key: { createdAt: -1 } }, { key: { status: 1 } }]);
    }
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const uuid = 'oc-' + uuidv4();
      const createdUser = new this.userModel({
        email: createUserDto.email,
        userHash: hashedPassword,
        name: '', // Empty name initially
        isTipperIdSet: false,
        uuid,
        tipper_id: uuid,
      });
      const savedUser = await createdUser.save();
      return this.sanitizeUserResponse(savedUser);
    } catch (error) {
      const mongoError = error as MongoError;
      if (mongoError.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.userModel.findOne({
      $or: [{ uuid: id }, { tipper_id: id }],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Handle tipper_id setting (one-time only)
    if (updateUserDto.tipper_id) {
      if (user.isTipperIdSet && user.tipper_id !== updateUserDto.tipper_id) {
        throw new BadRequestException('tipper_id can only be set once');
      }

      // Check if tipper_id is already taken by another user
      const existingUser = await this.userModel.findOne({
        tipper_id: updateUserDto.tipper_id,
        _id: { $ne: user._id }, // Exclude current user
      });
      if (existingUser) {
        throw new ConflictException('tipper_id already exists');
      }

      user.tipper_id = updateUserDto.tipper_id;
      user.isTipperIdSet = true;
    }

    // Update basic user information
    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }

    if (typeof updateUserDto.tippingEnabled === 'boolean') {
      user.tippingEnabled = updateUserDto.tippingEnabled;
    }

    // Update bank details if any bank-related fields are provided
    const hasBankUpdates =
      updateUserDto.accountNumber ||
      updateUserDto.ifscCode ||
      updateUserDto.accountHolderName ||
      updateUserDto.bankName;

    if (hasBankUpdates) {
      user.bankDetails = {
        ...user.bankDetails,
        accountNumber:
          updateUserDto.accountNumber || user.bankDetails.accountNumber,
        ifscCode: updateUserDto.ifscCode || user.bankDetails.ifscCode,
        accountHolderName:
          updateUserDto.accountHolderName || user.bankDetails.accountHolderName,
        bankName: updateUserDto.bankName || user.bankDetails.bankName,
        isVerified: false, // Reset verification when bank details change
        verificationStatus: 'PENDING',
        lastVerificationAttempt: null,
        verificationError: null,
      };
    }

    // Update metadata if provided
    if (updateUserDto._metadata) {
      user._metadata = {
        ...user._metadata,
        picture: updateUserDto._metadata.picture || user._metadata.picture,
        tipperPage: {
          title:
            updateUserDto._metadata.tipperPage?.title ||
            user._metadata.tipperPage.title,
          description:
            updateUserDto._metadata.tipperPage?.description ||
            user._metadata.tipperPage.description,
          profileImage:
            updateUserDto._metadata.tipperPage?.profileImage ||
            user._metadata.tipperPage.profileImage,
          coverImage:
            updateUserDto._metadata.tipperPage?.coverImage ||
            user._metadata.tipperPage.coverImage,
          backgroundImage:
            updateUserDto._metadata.tipperPage?.backgroundImage ||
            user._metadata.tipperPage.backgroundImage,
        },
      };
    }

    const updatedUser = await user.save();
    return this.sanitizeUserResponse(updatedUser);
  }

  async validateUser(loginUserDto: LoginUserDto): Promise<UserResponseDto> {
    const user = await this.userModel.findOne({ email: loginUserDto.email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginUserDto.password,
      user.userHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.sanitizeUserResponse(user);
  }

  async findAll(paginationDto: PaginationDto): Promise<UserResponseDto[]> {
    const users = await this.userModel
      .find()
      .skip(paginationDto.skip)
      .limit(paginationDto.limit)
      .exec();
    return users.map((user) => this.sanitizeUserResponse(user));
  }

  async findOne(id: string): Promise<UserResponseDto | null> {
    const user = await this.userModel
      .findOne({ $or: [{ uuid: id }, { tipper_id: id }] })
      .exec();
    return user ? this.sanitizeUserResponse(user) : null;
  }

  async verifyBankDetails(tipper_id: string): Promise<UserResponseDto> {
    const user = await this.userModel.findOne({ tipper_id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Mock payment gateway verification
    // In real implementation, this would call the payment gateway API
    interface VerificationResult {
      success: boolean;
      error: string | null;
    }

    const mockVerificationResult: VerificationResult = {
      success: true,
      error: null,
    };

    if (mockVerificationResult.success) {
      user.bankDetails = {
        ...user.bankDetails,
        isVerified: true,
        verificationStatus: 'VERIFIED',
        lastVerificationAttempt: new Date(),
        verificationError: null,
      };

      // Create transaction collection for verified user
      await this.createTransactionCollection(tipper_id);
    } else {
      user.bankDetails = {
        ...user.bankDetails,
        isVerified: false,
        verificationStatus: 'FAILED',
        lastVerificationAttempt: new Date(),
        verificationError:
          mockVerificationResult.error || 'Verification failed',
      };
    }

    const updatedUser = await user.save();
    return this.sanitizeUserResponse(updatedUser);
  }

  async getTransactions(
    tipper_id: string,
    paginationDto: PaginationDto,
    filterDto: TransactionFilterDto,
  ): Promise<any[]> {
    const user = await this.userModel.findOne({ tipper_id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.bankDetails.isVerified) {
      throw new NotFoundException('User bank details are not verified');
    }

    const collectionName = `${tipper_id}.transactions`;
    const collections = await this.connection.db.listCollections().toArray();
    const collectionExists = collections.some(
      (col) => col.name === collectionName,
    );

    if (!collectionExists) {
      throw new NotFoundException('No transactions found');
    }

    const query: TransactionQuery = {};

    if (filterDto.status) {
      query.status = filterDto.status;
    }

    if (filterDto.currency) {
      query.currency = filterDto.currency;
    }

    if (
      filterDto.minAmount !== undefined ||
      filterDto.maxAmount !== undefined
    ) {
      query.amount = {};
      if (filterDto.minAmount !== undefined) {
        query.amount.$gte = filterDto.minAmount;
      }
      if (filterDto.maxAmount !== undefined) {
        query.amount.$lte = filterDto.maxAmount;
      }
    }

    return this.connection.db
      .collection(collectionName)
      .find(query)
      .sort({ createdAt: -1 })
      .skip(paginationDto.skip)
      .limit(paginationDto.limit)
      .toArray();
  }

  private sanitizeTipResponse(
    transaction: TransactionDocument,
  ): TipResponseDto {
    return {
      _id: transaction._id.toString(),
      amount: transaction.amount,
      currency: transaction.currency,
      senderName: transaction.senderName,
      status: transaction.status,
      paymentId: transaction.paymentId || null,
      errorMessage: transaction.errorMessage || null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  async createTip(
    tipper_id: string,
    createTipDto: CreateTipDto,
  ): Promise<TipResponseDto> {
    const user = await this.userModel.findOne({ tipper_id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.tippingEnabled) {
      throw new BadRequestException('User tipping is not enabled');
    }

    if (!user.bankDetails || !user.bankDetails.isVerified) {
      throw new BadRequestException('User bank details not verified');
    }

    const transactionCollection = this.connection.db.collection(
      `${tipper_id}.transactions`,
    );
    if (!transactionCollection) {
      throw new BadRequestException('Transaction collection not found');
    }

    const transaction = {
      amount: createTipDto.amount,
      currency: createTipDto.currency,
      senderName: createTipDto.senderName,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await transactionCollection.insertOne(transaction);
    const insertedTransaction =
      await transactionCollection.findOne<TransactionDocument>({
        _id: result.insertedId,
      });
    if (!insertedTransaction) {
      throw new Error('Failed to create transaction');
    }

    try {
      const paymentResult = await this.paymentGatewayService.processPayment(
        createTipDto.amount,
        createTipDto.currency,
      );

      if (paymentResult.success) {
        await transactionCollection.updateOne(
          { _id: result.insertedId },
          {
            $set: {
              status: 'completed',
              paymentId: paymentResult.paymentId,
              updatedAt: new Date(),
            },
          },
        );
        const updatedTransaction =
          await transactionCollection.findOne<TransactionDocument>({
            _id: result.insertedId,
          });
        if (!updatedTransaction) {
          throw new Error('Failed to update transaction');
        }
        return this.sanitizeTipResponse(updatedTransaction);
      } else {
        await transactionCollection.updateOne(
          { _id: result.insertedId },
          {
            $set: {
              status: 'failed',
              errorMessage: paymentResult.error,
              updatedAt: new Date(),
            },
          },
        );
        const updatedTransaction =
          await transactionCollection.findOne<TransactionDocument>({
            _id: result.insertedId,
          });
        if (!updatedTransaction) {
          throw new Error('Failed to update transaction');
        }
        return this.sanitizeTipResponse(updatedTransaction);
      }
    } catch (error) {
      await transactionCollection.updateOne(
        { _id: result.insertedId },
        {
          $set: {
            status: 'failed',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          },
        },
      );
      const updatedTransaction =
        await transactionCollection.findOne<TransactionDocument>({
          _id: result.insertedId,
        });
      if (!updatedTransaction) {
        throw new Error('Failed to update transaction');
      }
      return this.sanitizeTipResponse(updatedTransaction);
    }
  }

  async getDashboard(
    tipper_id: string,
    params: DashboardParamsDto,
  ): Promise<DashboardResponse> {
    const user = await this.userModel.findOne({ tipper_id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const collectionName = `${tipper_id}.transactions`;
    const transactions = (await this.connection.db
      .collection(collectionName)
      .find()
      .sort({ createdAt: -1 })
      .toArray()) as unknown as Transaction[];

    const currencyBreakdown: {
      [currency: string]: {
        amount: number;
        count: number;
        convertedAmount: number;
      };
    } = {};
    let totalAmount = 0;
    let successfulCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    console.log(
      `Processing dashboard for user ${tipper_id} with base currency ${params.baseCurrency}`,
    );

    transactions.forEach((transaction) => {
      const currency = transaction.currency;
      if (!currencyBreakdown[currency]) {
        currencyBreakdown[currency] = {
          amount: 0,
          count: 0,
          convertedAmount: 0,
        };
      }

      // Only process completed transactions for total amount and currency breakdown
      if (transaction.status === 'COMPLETED') {
        const convertedAmount = this.currencyConversionService.convert(
          transaction.amount,
          transaction.currency,
          params.baseCurrency,
        );

        console.log(
          `Converting ${transaction.amount} ${transaction.currency} to ${params.baseCurrency}: ${convertedAmount}`,
        );

        currencyBreakdown[currency].amount += transaction.amount;
        currencyBreakdown[currency].convertedAmount += convertedAmount;
        totalAmount += convertedAmount;
        successfulCount++;
      } else if (transaction.status === 'FAILED') {
        failedCount++;
      } else if (transaction.status === 'PENDING') {
        pendingCount++;
      }

      // Update count for all transactions regardless of status
      currencyBreakdown[currency].count += 1;
    });

    const summary: TransactionSummary = {
      totalAmount,
      baseCurrency: params.baseCurrency,
      transactionCount: transactions.length,
      successfulCount,
      failedCount,
      pendingCount,
      averageAmount: successfulCount > 0 ? totalAmount / successfulCount : 0,
      currencyBreakdown,
    };

    console.log(`Dashboard summary for ${tipper_id}:`, {
      totalAmount,
      baseCurrency: params.baseCurrency,
      transactionCount: transactions.length,
      successfulCount,
      failedCount,
      pendingCount,
      averageAmount: successfulCount > 0 ? totalAmount / successfulCount : 0,
    });

    const recentTransactions = transactions
      .slice(0, params.recentTransactionsLimit)
      .map((transaction) => ({
        amount: transaction.amount,
        currency: transaction.currency,
        convertedAmount:
          transaction.status === 'COMPLETED'
            ? this.currencyConversionService.convert(
                transaction.amount,
                transaction.currency,
                params.baseCurrency,
              )
            : 0,
        status: transaction.status,
        createdAt: transaction.createdAt,
      }));

    return {
      userId: user.tipper_id,
      userName: user.name,
      summary,
      recentTransactions,
    };
  }
}
