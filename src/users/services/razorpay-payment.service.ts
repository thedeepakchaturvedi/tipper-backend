import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import crypto from 'crypto';

export class RazorpayPaymentService {
  // Base URLs for Razorpay APIs
  RZP_V1_BASE_URL = 'https://api.razorpay.com/v1';
  RZP_V2_BASE_URL = 'https://api.razorpay.com/v2';
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    if (!this.configService.get('RAZORPAY')) {
      throw new Error(
        'Razorpay configuration is missing in environment variables.',
      );
    }
    const RAZORPAY_MODE = this.configService.get<string>('RAZORPAY');

    this.RAZORPAY_KEY_ID = this.configService.get(
      `RAZORPAY_KEY_${RAZORPAY_MODE}_ID`,
    );
    this.RAZORPAY_KEY_SECRET = this.configService.get(
      `RAZORPAY_KEY_${RAZORPAY_MODE}_SECRET`,
    );

    if (this.configService.get('NODE_ENV') === 'development') {
      console.log('Razorpay Service Initialized');
      console.log('RAZORPAY_KEY_ID:', this.RAZORPAY_KEY_ID);
      console.log('RAZORPAY_KEY_SECRET:', this.RAZORPAY_KEY_SECRET);
    }
  }

  // --- Authentication Helper ---
  getAuthHeader = () => {
    if (!this.RAZORPAY_KEY_ID || !this.RAZORPAY_KEY_SECRET) {
      throw new Error(
        'Razorpay API Keys are not configured in environment variables.',
      );
    }
    const credentials = `${this.RAZORPAY_KEY_ID}:${this.RAZORPAY_KEY_SECRET}`;
    const buffer = Buffer.from(credentials);
    return `Basic ${buffer.toString('base64')}`;
  };

  // --- Generic API Call Helper (Using Axios) ---
  makeRazorpayRequest = async (method, url, data = null) => {
    try {
      const response = await axios({
        method: method,
        url: url, // Expects full URL
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        data: data,
      });
      console.log(`Razorpay API Success: ${method} ${url}`);
      return response.data;
    } catch (error: any) {
      console.error(`Razorpay API Error: ${method} ${url}`);
      if ((error as AxiosError).response) {
        console.error('Error Data:', (error as AxiosError).response?.data);
        console.error('Error Status:', (error as AxiosError).response.status);
        const status = (error as AxiosError).response.status;
        const apiError = new Error(`Razorpay API Error (${status})`);
        throw apiError;
      } else if ((error as AxiosError).request) {
        console.error('Error Request:', (error as AxiosError).request);
        throw new Error(
          'Razorpay API Error: No response received from server.',
        );
      } else {
        console.error('Error Message:', (error as AxiosError).message);
        throw new Error(`Razorpay API Error: ${(error as AxiosError).message}`);
      }
    }
  };

  // --- Payment & Transfer APIs (Using Axios Helper for V1) ---

  /**
   * Creates a Razorpay Order.
   * API Doc: https://razorpay.com/docs/api/orders/#create-an-order
   * @param {number} amount - Amount in paisa.
   * @param {string} currency - Currency code (e.g., 'INR').
   * @param {string} receiptId - Your internal receipt ID.
   * @returns {Promise<object>} The created order object.
   */
  createOrder = async (amount, currency, receiptId) => {
    const url = `${this.RZP_V1_BASE_URL}/orders`;
    const data = { amount, currency, receipt: receiptId };
    return await this.makeRazorpayRequest('POST', url, data);
  };

  /**
   * Fetches payment details.
   * API Doc: https://razorpay.com/docs/api/payments/#fetch-payment-by-id
   * @param {string} paymentId - The Razorpay Payment ID (pay_...).
   * @returns {Promise<object>} The payment object.
   */
  fetchPayment = async (paymentId: string) => {
    const url = `${this.RZP_V1_BASE_URL}/payments/${paymentId}`;
    return await this.makeRazorpayRequest('GET', url);
  };

  /**
   * Creates a Transfer to a Linked Account after a payment is captured.
   * API Doc: https://razorpay.com/docs/api/payments/route/#create-transfers-from-payments (Conceptual)
   * Endpoint: POST /v1/payments/{payment_id}/transfers
   * @param {string} paymentId - The Razorpay Payment ID (pay_...).
   * @param {string} linkedAccountId - The recipient creator's Razorpay Account ID (acc_...).
   * @param {number} transferAmount - Amount to transfer in paisa.
   * @param {string} currency - Currency code ('INR').
   * @param {object} [notes={}] - Optional notes for the transfer.
   * @returns {Promise<object>} The created transfer object/response.
   */
  createTransfer = async (
    paymentId: string,
    linkedAccountId: string,
    transferAmount: number,
    currency: string,
    notes = {},
  ) => {
    const url = `${this.RZP_V1_BASE_URL}/payments/${paymentId}/transfers`;
    const data = {
      transfers: [
        { account: linkedAccountId, amount: transferAmount, currency, notes },
      ],
    };
    return await this.makeRazorpayRequest('POST', url, data);
  };

  /**
   * Verifies the signature received from Razorpay Checkout callback.
   * Verification Logic Doc: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/#step-5-verify-the-signature
   * @param {string} razorpay_order_id - Order ID from callback.
   * @param {string} razorpay_payment_id - Payment ID from callback.
   * @param {string} razorpay_signature - Signature from callback.
   * @returns {boolean} True if the signature is valid, false otherwise.
   */
  verifyPaymentSignature = (
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
  ) => {
    if (!this.RAZORPAY_KEY_SECRET) {
      console.error(
        'RAZORPAY_KEY_SECRET missing for payment signature verification.',
      );
      return false;
    }
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(razorpay_signature, 'hex'),
      );
    } catch (error) {
      console.error('Error comparing payment signatures:', error);
      return false;
    }
  };
}
