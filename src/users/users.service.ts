import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
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
import { Collection, InsertOneResult, ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { RazorpayService } from './services/razorpay.service';
import { RazorpayPaymentService } from './services/razorpay-payment.service';
import { ConfigService } from '@nestjs/config';
import { VerifyTipDto } from './dto/verify-tip.dto';
import {
  DEFAULT_TIPPPER_FEE_PERCENTAGE,
  GST_PERCENTAGE,
  RAZORPAY_FEE_PERCENTAGE,
} from '../utils/app.constants';
import { validateTipperId } from '../utils/tipper-id.utils';

interface MongoError extends Error {
  code: number;
}

interface razorpayProductInterface {
  id: string;
  activation_status: string;
  [key: string]: any;
}

interface TransactionDocument {
  _id: ObjectId;
  amount: number;
  currency: string;
  senderName: string;
  message?: string;
  status: string;
  paymentId?: string;
  errorMessage?: string;
  isBanned: boolean;
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
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
  isBanned?: boolean;
  $or?: Array<{
    isBanned?: boolean | { $exists: boolean };
  }>;
}

interface RazorpayTransferResponse {
  id?: string;
  items?: Array<{ id?: string; [key: string]: any }>;
  [key: string]: any;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private connection: Connection,
    @Inject(RazorpayService) private razorpayService: RazorpayService,
    @Inject(RazorpayPaymentService)
    private razorpayPaymentService: RazorpayPaymentService,
    @Inject(ConfigService) private configService: ConfigService,
    private paymentGatewayService: PaymentGatewayService,
    private currencyConversionService: CurrencyConversionService,
  ) {}

  private sanitizeUserResponse(user: UserDocument): Partial<UserResponseDto> {
    return {
      _id: (user._id as Types.ObjectId).toString(),
      uuid: user.uuid,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      tipper_id: user.tipper_id,
      tippingEnabled: user.tippingEnabled,
      _metadata: user._metadata,
      razorpay_activation_status: user.razorpay_activation_status,
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

  async checkIdAvailability(username: string): Promise<boolean> {
    const existingUser = await this.userModel
      .findOne({
        tipper_id: { $regex: new RegExp(`^${username}$`, 'i') }, // Case-insensitive exact match
      })
      .exec();
    return !existingUser;
  }

  async create(
    createUserDto: CreateUserDto,
  ): Promise<Partial<UserResponseDto>> {
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
    req: Request,
  ): Promise<Partial<UserResponseDto>> {
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

      // Validate that the tipper ID is not in the restricted list
      validateTipperId(updateUserDto.tipper_id);

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
    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.phone !== undefined) {
      user.phone = updateUserDto.phone;
    }

    // Update email verification status
    const emailVerified = updateUserDto.emailVerified;
    const emailAuthKey = this.configService.get<string>('EMAIL_AUTH_KEY');
    const commonKey = req.headers['x-common-key'];

    if (typeof emailVerified === 'boolean') {
      if (!commonKey || !emailAuthKey || emailAuthKey !== commonKey) {
        throw new BadRequestException('Invalid email auth key');
      }

      user.emailVerified = emailVerified;
    }

    if (typeof updateUserDto.tippingEnabled === 'boolean') {
      user.tippingEnabled = updateUserDto.tippingEnabled;
    }

    // Update bank details if any bank-related fields are provided
    const hasBankUpdates =
      updateUserDto.accountNumber !== undefined ||
      updateUserDto.ifscCode !== undefined ||
      updateUserDto.accountHolderName !== undefined ||
      updateUserDto.bankName !== undefined;

    if (hasBankUpdates) {
      user.bankDetails = {
        ...user.bankDetails,
        accountNumber:
          updateUserDto.accountNumber !== undefined
            ? updateUserDto.accountNumber
            : user.bankDetails.accountNumber,
        ifscCode:
          updateUserDto.ifscCode !== undefined
            ? updateUserDto.ifscCode
            : user.bankDetails.ifscCode,
        accountHolderName:
          updateUserDto.accountHolderName !== undefined
            ? updateUserDto.accountHolderName
            : user.bankDetails.accountHolderName,
        bankName:
          updateUserDto.bankName !== undefined
            ? updateUserDto.bankName
            : user.bankDetails.bankName,
        isVerified: false, // Reset verification when bank details change
        verificationStatus: 'PENDING',
        lastVerificationAttempt: null,
        verificationError: null,
      };
    }

    // Update metadata if provided
    if (updateUserDto._metadata) {
      const picUrl =
        updateUserDto._metadata.picture?.url !== undefined
          ? updateUserDto._metadata.picture.url
          : user._metadata?.picture?.url || '';

      const picFileName =
        updateUserDto._metadata.picture?.fileName !== undefined
          ? updateUserDto._metadata.picture.fileName
          : user._metadata?.picture?.fileName || '';

      user._metadata = {
        ...user._metadata,
        picture: {
          url: picUrl,
          fileName: picFileName,
        },
        tipperPage: {
          title:
            updateUserDto._metadata.tipperPage?.title !== undefined
              ? updateUserDto._metadata.tipperPage.title
              : user._metadata?.tipperPage?.title || '',
          description:
            updateUserDto._metadata.tipperPage?.description !== undefined
              ? updateUserDto._metadata.tipperPage.description
              : user._metadata?.tipperPage?.description || '',
          profileImage: {
            url:
              updateUserDto._metadata.tipperPage?.profileImage?.url !==
              undefined
                ? updateUserDto._metadata.tipperPage.profileImage.url
                : user._metadata?.tipperPage?.profileImage?.url || '',
            fileName:
              updateUserDto._metadata.tipperPage?.profileImage?.fileName !==
              undefined
                ? updateUserDto._metadata.tipperPage.profileImage.fileName
                : user._metadata?.tipperPage?.profileImage?.fileName || '',
          },
          coverImage: {
            url:
              updateUserDto._metadata.tipperPage?.coverImage?.url !== undefined
                ? updateUserDto._metadata.tipperPage.coverImage.url
                : user._metadata?.tipperPage?.coverImage?.url || '',
            fileName:
              updateUserDto._metadata.tipperPage?.coverImage?.fileName !==
              undefined
                ? updateUserDto._metadata.tipperPage.coverImage.fileName
                : user._metadata?.tipperPage?.coverImage?.fileName || '',
          },
          backgroundImage: {
            url:
              updateUserDto._metadata.tipperPage?.backgroundImage?.url !==
              undefined
                ? updateUserDto._metadata.tipperPage.backgroundImage.url
                : user._metadata?.tipperPage?.backgroundImage?.url || '',
            fileName:
              updateUserDto._metadata.tipperPage?.backgroundImage?.fileName !==
              undefined
                ? updateUserDto._metadata.tipperPage.backgroundImage.fileName
                : user._metadata?.tipperPage?.backgroundImage?.fileName || '',
          },
        },
        streamLink:
          updateUserDto._metadata.streamLink !== undefined
            ? updateUserDto._metadata.streamLink
            : user._metadata?.streamLink || '',
      };
    }

    const updatedUser = await user.save();
    return this.sanitizeUserResponse(updatedUser);
  }

  async findOne(id: string): Promise<Partial<UserResponseDto> | null> {
    const user = await this.userModel
      .findOne({ $or: [{ uuid: id }, { tipper_id: id }] })
      .exec();

    let bankDetailsUpdated = false;
    if (user) {
      // Check if bank details are updated
      if (
        user.bankDetails &&
        user.bankDetails.accountNumber &&
        user.bankDetails.ifscCode &&
        user.bankDetails.accountHolderName &&
        user.bankDetails.bankName
      ) {
        bankDetailsUpdated = true;
      }
    }

    return user
      ? { ...this.sanitizeUserResponse(user), bankDetailsUpdated }
      : null;
  }

  async verifyBankDetails(tipper_id: string): Promise<any> {
    const user = await this.userModel.findOne({ tipper_id });
    let razorpayAccountId = user?.razorpay_account_id;
    let razorpayProductId = user?.razorpay_product_id;
    let razorpayActivationStatus = user?.razorpay_activation_status;
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.phone) {
      throw new BadRequestException('User phone number is not set');
    }

    if (!user.emailVerified || !user.email) {
      throw new BadRequestException('User email is not verified');
    }

    // create razorpay account if not already created
    if (!razorpayAccountId) {
      const accountData = {
        type: 'route',
        email: user.email,
        phone: user.phone,
        legal_business_name: user.bankDetails.accountHolderName,
        business_type: 'individual',
        contact_name: user.bankDetails.accountHolderName,
        profile: {
          category: 'media_and_entertainment',
          subcategory: 'video_on_demand',
          addresses: {
            registered: {
              street1: 'NA',
              street2: 'NA',
              city: 'Mumbai',
              state: 'Maharashtra',
              postal_code: '401301',
              country: 'IN',
            },
          },
        },
      };
      const rzpAccount: { id: string; [key: string]: any } =
        await this.razorpayService.createLinkedAccount(accountData);
      console.log('Razorpay Account Created:', rzpAccount);
      razorpayAccountId = rzpAccount.id;
      user.razorpay_account_id = razorpayAccountId;
      await user.save();
    }

    // create individual stakeholder
    if (razorpayAccountId) {
      // considering business type is individual for now
      let existingStakeholdersFound = false;
      const existingStakeholders: { id: string; [key: string]: any } =
        await this.razorpayService.fetchStakeholders(razorpayAccountId);
      if (
        existingStakeholders &&
        existingStakeholders.items &&
        Array.isArray(existingStakeholders.items)
      ) {
        // Check if stakeholder with matching email exists
        existingStakeholdersFound = existingStakeholders.items.some(
          (sh: { email: string }) =>
            sh.email && sh.email.toLowerCase() === user.email.toLowerCase(),
        );
      }

      console.log('Existing Stakeholders:', existingStakeholders);
      console.log('Existing Stakeholders Found:', existingStakeholdersFound);

      if (!existingStakeholdersFound) {
        const individualStakeholderData = {
          name: user.bankDetails.accountHolderName,
          email: user.email,
        };

        await this.razorpayService.createStakeholder(
          razorpayAccountId,
          individualStakeholderData,
        );
        console.log(
          'Individual Stakeholder Created with:',
          individualStakeholderData,
        );
      }
    }

    // Request route product config if no product id is found
    let rzpProduct: razorpayProductInterface;
    if (!razorpayProductId) {
      rzpProduct = await this.razorpayService.requestProductConfiguration(
        razorpayAccountId,
        'route',
      );

      console.log('Razorpay Product Config:', rzpProduct);
      razorpayProductId = rzpProduct.id;
      user.razorpay_product_id = razorpayProductId;
      razorpayActivationStatus = rzpProduct.activation_status;
      user.razorpay_activation_status = razorpayActivationStatus;
      user.bankDetails.lastVerificationAttempt = new Date();

      await user.save();
    }

    // Update Product config with Bank details
    if (
      razorpayAccountId &&
      razorpayProductId &&
      razorpayActivationStatus !== 'activated'
    ) {
      const updateData = {
        settlements: {
          name: user.bankDetails.accountHolderName,
          account_number: user.bankDetails.accountNumber,
          ifsc_code: user.bankDetails.ifscCode,
          beneficiary_name: user.bankDetails.accountHolderName,
        },
        tnc_accepted: true,
        // Add other KYC fields here
      };
      const updatedProduct: razorpayProductInterface =
        await this.razorpayService.updateProductConfiguration(
          razorpayAccountId,
          razorpayProductId,
          updateData,
        );

      console.log('Razorpay Product Updated:', updatedProduct);
      razorpayActivationStatus = updatedProduct.activation_status;
      user.razorpay_activation_status = razorpayActivationStatus;
      await user.save();
    }

    user.bankDetails = {
      ...user.bankDetails,
      isVerified: false,
      verificationStatus: 'PENDING',
      verificationError: null,
    };

    if (razorpayActivationStatus === 'activated') {
      user.bankDetails.isVerified = true;
      user.bankDetails.verificationStatus = 'VERIFIED';
      // Create transaction collection if it doesn't exist
      await this.createTransactionCollection(tipper_id);
    }

    await user.save();
    return {
      status: {
        razorpayActivationStatus: razorpayActivationStatus,
        bankStatus: user.bankDetails.verificationStatus,
        message:
          razorpayActivationStatus === 'activated'
            ? 'Bank details verified'
            : 'Bank details verification initiated',
      },
    };
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
      throw new NotFoundException('User is not verified ~ PG');
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

    // Handle banned transactions filter
    if (!filterDto.includeBanned) {
      // Include transactions where isBanned is false OR isBanned doesn't exist
      query.$or = [{ isBanned: false }, { isBanned: { $exists: false } }];
    }

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

    if (filterDto.afterDate) {
      query.createdAt = {
        $gte: new Date(filterDto.afterDate),
        $lte: new Date(), // Current date/time
      };
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
      message: transaction.message || null,
      status: transaction.status,
      paymentId: transaction.paymentId || null,
      errorMessage: transaction.errorMessage || null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  async createTip(tipper_id: string, createTipDto: CreateTipDto): Promise<any> {
    const user = await this.userModel.findOne({ tipper_id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.tippingEnabled) {
      throw new BadRequestException('User tipping is not enabled');
    }

    if (
      !user.bankDetails ||
      !user.bankDetails.isVerified ||
      user.razorpay_activation_status !== 'activated'
    ) {
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
      message: createTipDto.message || '',
      status: 'pending',
      isBanned: false,
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

    if (this.configService.get<string>('BYPASS_TRANSACTION') === 'true') {
      console.log('***************************');
      console.log('Transaction Bypassed');
      console.log('***************************');
      return this.mockPayment(
        createTipDto,
        user,
        transactionCollection,
        result,
      );
    } else {
      try {
        const amountInPaisa = Math.round(createTipDto.amount * 100);
        const currency = 'INR';
        const receiptId = `tip_${uuidv4()}`;

        console.log(
          `Initiating tip order for creator ${user.tipper_id} (RZP: ${user.razorpay_account_id}), Amount: ${amountInPaisa} paisa with Receipt ID: ${receiptId}`,
        );

        const order: { id: string } =
          await this.razorpayPaymentService.createOrder(
            amountInPaisa,
            currency,
            receiptId,
          );

        console.log('Razorpay Order Created:', order);

        // update the transaction with the order ID and status
        await transactionCollection.updateOne(
          { _id: result.insertedId },
          {
            $set: {
              status: 'order created',
              paymentId: receiptId,
              razorpayOrderId: order.id,
              updatedAt: new Date(),
            },
          },
        );

        return order;
      } catch (error) {
        console.error('Error in initiateTip:', error);
        throw error;
      }
    }
  }

  async verifyTip(
    tipper_id: string,
    tipperPaymentId,
    verifyTipDto: VerifyTipDto,
  ): Promise<any> {
    try {
      const { razorpayOrderId, razorpaySignature, razorpayPaymentId } =
        verifyTipDto;

      if (!razorpayOrderId || !razorpaySignature || !razorpayPaymentId) {
        throw new BadRequestException(
          'Missing required payment verification details or target creator ID.',
        );
      }

      // 1. Verify Payment Signature
      const isSignatureValid =
        this.razorpayPaymentService.verifyPaymentSignature(
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        );

      if (!isSignatureValid) {
        console.warn(`Invalid payment signature for order ${razorpayOrderId}`);
        throw new BadRequestException(
          'Payment verification failed: Invalid signature.',
        );
      }

      console.log(
        `Payment signature verified for order ${razorpayOrderId}, payment ${razorpayPaymentId}`,
      );

      // 2. Fetch Payment Details (Reliable Amount & Status)
      const payment: { status: string; [key: string]: any } =
        await this.razorpayPaymentService.fetchPayment(razorpayPaymentId);

      if (payment.status !== 'captured') {
        console.warn(
          `Payment ${razorpayPaymentId} not captured. Status: ${payment.status}`,
        );
        throw new BadRequestException(
          `Payment not captured yet (Status: ${payment.status}).`,
        );
      }

      const paymentAmount = payment.amount; // Amount in paisa

      // 3. Find Target Creator (Check again)
      const user = await this.userModel.findOne({ tipper_id });
      if (
        !user ||
        !user.razorpay_account_id ||
        user.razorpay_activation_status !== 'activated'
      ) {
        console.error(
          `Cannot create transfer: Target creator ${tipper_id} not found/activated after payment.`,
        );
        throw new BadRequestException(
          'Target creator cannot receive transfer.',
        );
      }

      console.log(
        `Calculating transfer for Gross Amount: ${paymentAmount} paisa`,
      );

      // 4. Calculate Transfer Amount
      const razorpayFee = Math.floor(paymentAmount * RAZORPAY_FEE_PERCENTAGE);
      const gstOnFee = Math.floor(razorpayFee * GST_PERCENTAGE);
      const tipperFee = Math.floor(
        paymentAmount * DEFAULT_TIPPPER_FEE_PERCENTAGE,
      );

      const totalDeductions = razorpayFee + gstOnFee + tipperFee;
      const netAmount = paymentAmount - totalDeductions;

      console.log(
        `Razorpay Fee: ${razorpayFee}, GST on Fee: ${gstOnFee}, Total Deduction: ${totalDeductions}, Net Amount: ${netAmount}`,
      );

      if (netAmount <= 0) {
        console.warn(
          `Net amount after fee/GST deduction is zero or negative for payment ${razorpayPaymentId}.`,
        );
        return {
          success: false,
          message:
            'Net amount is zero or negative after deductions. No transfer created.',
        };
      }

      // 5. Create Transfer
      const transferResponse: RazorpayTransferResponse =
        await this.razorpayPaymentService.createTransfer(
          razorpayPaymentId,
          user.razorpay_account_id,
          netAmount,
          'INR',
          {
            platform_tip_reference: razorpayOrderId,
            tipper_id,
          },
        );
      const transferId =
        transferResponse.id ||
        (transferResponse.items &&
          Array.isArray(transferResponse.items) &&
          transferResponse.items[0]?.id);

      console.log(`Transfer created successfully:`, transferResponse);

      // update the transaction in the db
      const transactionCollection = this.connection.db.collection(
        `${tipper_id}.transactions`,
      );
      await transactionCollection.updateOne(
        { paymentId: tipperPaymentId },
        {
          $set: {
            status: 'completed',
            razorpayPaymentId: razorpayPaymentId,
            razorpayTransferId: transferId,
            updatedAt: new Date(),
          },
        },
      );
      console.log(
        `Transaction updated successfully for payment ${razorpayPaymentId}`,
      );

      return {
        success: true,
        message: 'Payment verified and transfer created successfully.',
        transferId,
      };
    } catch (error) {
      console.error('Error in verifyTip:', error);
      throw error;
    }
  }

  async updateTransaction(
    tipper_id: string,
    transactionId: string,
    updateTransactionDto: UpdateTransactionDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userModel.findOne({ tipper_id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const collectionName = `${tipper_id}.transactions`;
    const transactionCollection = this.connection.db.collection(collectionName);

    // Prepare update object with proper typing
    const updateData: {
      isBanned?: boolean;
      status?: string;
      errorMessage?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    // Add fields to update if they are provided
    if (updateTransactionDto.isBanned !== undefined) {
      updateData.isBanned = updateTransactionDto.isBanned;
    }
    // if (updateTransactionDto.status) {
    //   updateData.status = updateTransactionDto.status;
    // }
    if (updateTransactionDto.errorMessage !== undefined) {
      updateData.errorMessage = updateTransactionDto.errorMessage;
    }

    const result = await transactionCollection.updateOne(
      { _id: new ObjectId(transactionId) },
      { $set: updateData },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      success: true,
      message: 'Transaction updated successfully',
    };
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

  async mockPayment(
    createTipDto: CreateTipDto,
    user: User,
    transactionCollection: Collection,
    result: InsertOneResult,
  ): Promise<TipResponseDto> {
    try {
      const paymentResult = await this.paymentGatewayService.createOrder(
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
}
