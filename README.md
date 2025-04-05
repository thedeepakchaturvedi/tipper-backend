# OnlyChat - Tipping Platform

A NestJS-based tipping platform that allows users to receive tips in multiple currencies with real-time currency conversion.

## Table of Contents

- [Setup](#setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
  - [Testing](#testing)
- [API Specifications](#api-specifications)
  - [Base URL](#base-url)
  - [Authentication](#authentication)
  - [Endpoints](#endpoints)
  - [Error Handling](#error-handling)
  - [Notes](#notes)

## Setup

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6.0 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/onlychat.git
cd onlychat
```

2. Install dependencies

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Application
PORT=3000
NODE_ENV=development

# MongoDB
DATABASE_URL=mongodb://localhost:27017/onlychat
```

### Running the Application

1. Development mode

```bash
npm run start:dev
```

2. Production mode

```bash
npm run build
npm run start:prod
```

3. Watch mode

```bash
npm run start:watch
```

### Testing

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## API Specifications

### Base URL

```
/api/users
```

### Authentication

- All endpoints except /register, /login, /transaction, and /tip require authentication
- Authentication is done via JWT token in the Authorization header
- Format: `Authorization: Bearer <token>`

### Endpoints

#### 1. User Registration

```http
POST /register
```

**Request Body:**

```json
{
  "name": "John Doe",
  "tipper_id": "john123",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201 Created):**

```json
{
  "_id": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "tipper_id": "john123",
  "tippingEnabled": false,
  "bankDetails": {
    "isVerified": false,
    "verificationStatus": "PENDING",
    "lastVerificationAttempt": null
  }
}
```

#### 2. User Login

```http
POST /login
```

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200 OK):**

```json
{
  "_id": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "tipper_id": "john123",
  "tippingEnabled": false,
  "bankDetails": {
    "isVerified": false,
    "verificationStatus": "PENDING",
    "lastVerificationAttempt": null
  }
}
```

#### 3. Update User Details

```http
PUT /:id
```

**Request Body:**

```json
{
  "name": "John Doe Updated",
  "accountNumber": "1234567890",
  "ifscCode": "ABCD0001234",
  "accountHolderName": "John Doe",
  "bankName": "State Bank of India",
  "tippingEnabled": true
}
```

#### 4. Verify Bank Details

```http
POST /:id/verify-bank
```

#### 5. Create Tip

```http
POST /:id/tip
```

**Request Body:**

```json
{
  "amount": 100,
  "currency": "INR",
  "senderName": "Jane Smith",
  "message": "Great work!"
}
```

#### 6. Get User Transactions

```http
GET /:id/transactions
```

**Query Parameters:**

- `status`: Filter by transaction status (PENDING, COMPLETED, FAILED)
- `currency`: Filter by currency (INR, USD, EUR)
- `minAmount`: Minimum transaction amount
- `maxAmount`: Maximum transaction amount
- `skip`: Pagination offset (default: 0)
- `limit`: Number of records per page (default: 10)

#### 7. Get User Dashboard

```http
GET /:id/dashboard
```

**Query Parameters:**

- `baseCurrency`: Base currency for amount conversion (default: INR)
- `recentTransactionsLimit`: Number of recent transactions (default: 10, max: 100)

### Error Handling

The API uses standard HTTP status codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

Error Response Format:

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Error type"
}
```

### Notes

- All timestamps are in ISO 8601 format
- Currency codes follow ISO 4217 standard
- Amounts are in smallest unit (paise for INR, cents for USD)
- Bank verification is mocked (90% success rate)
- Currency conversion uses mock rates in development

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
