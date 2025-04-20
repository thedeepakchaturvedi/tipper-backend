import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  Put,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateTipDto } from './dto/create-tip.dto';
import { DashboardResponse } from './dto/dashboard.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { DashboardParamsDto } from './dto/dashboard-params.dto';
import { AuthGuard } from './guards/auth.guard';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SupportedCurrencies } from 'src/users/dto/supported-currencies.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { TipResponseDto } from './dto/tip-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { VerifyTipDto } from './dto/verify-tip.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginUserDto: LoginUserDto): Promise<UserResponseDto> {
    return this.usersService.validateUser(loginUserDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ summary: 'Update user details' })
  @ApiParam({
    name: 'id',
    description: 'User UUID or tipper_id',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'User details updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 400,
    description: 'tipper_id can only be set once',
  })
  @ApiResponse({
    status: 409,
    description: 'tipper_id already exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Post(':id/verify-bank')
  @ApiOperation({ summary: 'Verify user bank details' })
  @ApiParam({
    name: 'id',
    description: 'User ID (tipper_id)',
    example: 'user123',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank details verified successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async verifyBank(@Param('id') tipperId: string): Promise<UserResponseDto> {
    return this.usersService.verifyBankDetails(tipperId);
  }

  @Post(':id/tip')
  @ApiOperation({ summary: 'Create a new tip for a user' })
  @ApiParam({
    name: 'id',
    description: 'User ID (tipper_id)',
    example: 'user123',
  })
  @ApiResponse({
    status: 201,
    description: 'Tip created successfully',
    type: TipResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found or tipping not enabled',
  })
  async createTip(
    @Param('id') id: string,
    @Body() createTipDto: CreateTipDto,
  ): Promise<TipResponseDto> {
    return this.usersService.createTip(id, createTipDto);
  }

  @Post(':id/tip/:tipperPaymentId/verify')
  @ApiOperation({ summary: 'Verify already created tip for a user' })
  @ApiParam({
    name: 'id',
    description: 'User ID (tipper_id)',
    example: 'user123',
  })
  @ApiParam({
    name: 'tipperPaymentId',
    description: 'Payment ID',
    example: 'tip_84b37052-2689-4bbc-8238-0dc9edfd2c75',
  })
  async verifyTip(
    @Param('id') id: string,
    @Param('tipperPaymentId') tipperPaymentId: string,
    @Body() verifyTipDto: VerifyTipDto,
  ): Promise<any> {
    return this.usersService.verifyTip(id, tipperPaymentId, verifyTipDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Number of records to skip',
    type: 'number',
    example: 0,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records to return',
    type: 'number',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    type: [UserResponseDto],
  })
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<UserResponseDto[]> {
    return this.usersService.findAll(paginationDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get user by UUID or tipper_id' })
  @ApiParam({
    name: 'id',
    description: 'User UUID or tipper_id',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get user transactions with filtering' })
  @ApiParam({
    name: 'id',
    description: 'User ID (tipper_id)',
    example: 'user123',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Number of records to skip',
    type: 'number',
    example: 0,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records to return',
    type: 'number',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by transaction status',
    enum: ['COMPLETED', 'FAILED', 'PENDING'],
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    description: 'Filter by currency',
    enum: Object.values(SupportedCurrencies),
  })
  @ApiQuery({
    name: 'minAmount',
    required: false,
    description: 'Minimum transaction amount',
    type: 'number',
    example: 10,
  })
  @ApiQuery({
    name: 'maxAmount',
    required: false,
    description: 'Maximum transaction amount',
    type: 'number',
    example: 1000,
  })
  @ApiResponse({
    status: 200,
    description: 'List of transactions retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found or no transactions available',
  })
  async getTransactions(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: TransactionFilterDto,
  ) {
    return this.usersService.getTransactions(id, paginationDto, filterDto);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get user dashboard with transaction summary' })
  @ApiParam({
    name: 'id',
    description: 'User ID (tipper_id)',
    example: 'user123',
  })
  @ApiQuery({
    name: 'baseCurrency',
    required: false,
    description: 'Base currency for amount conversion',
    enum: Object.values(SupportedCurrencies),
    example: SupportedCurrencies.INR,
  })
  @ApiQuery({
    name: 'recentTransactionsLimit',
    required: false,
    description: 'Number of recent transactions to return',
    type: 'integer',
    minimum: 1,
    maximum: 100,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
    type: DashboardResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getDashboard(
    @Param('id') tipperId: string,
    @Query() params: DashboardParamsDto,
  ): Promise<DashboardResponse> {
    return this.usersService.getDashboard(tipperId, params);
  }

  @Patch(':tipper_id/transactions/:transactionId')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiParam({ name: 'tipper_id', description: 'User ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User or transaction not found' })
  async updateTransaction(
    @Param('tipper_id') tipper_id: string,
    @Param('transactionId') transactionId: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.usersService.updateTransaction(
      tipper_id,
      transactionId,
      updateTransactionDto,
    );
  }
}
