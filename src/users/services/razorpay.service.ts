import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export class RazorpayService {
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

  /**
   * Creates a Razorpay Linked Account.
   * API Doc: https://razorpay.com/docs/api/payments/route/create-linked-account/
   * @param {object} accountData - Data for creating the account (type: 'route', email, phone, etc.)
   * @returns {Promise<object>} The created account object from Razorpay.
   */
  createLinkedAccount = async (accountData) => {
    try {
      const url = `${this.RZP_V2_BASE_URL}/accounts`;
      return await this.makeRazorpayRequest('POST', url, accountData);
    } catch (error) {
      console.error('Error creating linked account:', error);
      throw new Error('Failed to create linked account');
    }
  };

  /**
   * Fetches all Stakeholders for a Linked Account.
   * API Doc: https://razorpay.com/docs/api/partners/stakeholder/fetch-all/
   * @param {string} accountId - The Razorpay Linked Account ID (acc_...).
   * @returns {Promise<object>} Collection object containing stakeholder items.
   */
  fetchStakeholders = async (accountId) => {
    try {
      const url = `${this.RZP_V2_BASE_URL}/accounts/${accountId}/stakeholders`;
      return await this.makeRazorpayRequest('GET', url);
    } catch (error) {
      console.error('Error fetching stakeholders:', error);
      throw new Error('Failed to fetch stakeholders');
    }
  };

  /**
   * Creates a Stakeholder for a Linked Account.
   * API Doc: https://razorpay.com/docs/api/payments/route/create-stakeholder/
   * @param {string} accountId - The Razorpay Linked Account ID (acc_...).
   * @param {object} stakeholderData - Data for the stakeholder (name, email, percentage_ownership, etc.).
   * @returns {Promise<object>} The created stakeholder object.
   */
  createStakeholder = async (accountId, stakeholderData) => {
    try {
      const url = `${this.RZP_V2_BASE_URL}/accounts/${accountId}/stakeholders`;
      return await this.makeRazorpayRequest('POST', url, stakeholderData);
    } catch (error) {
      console.error('Error creating stakeholder:', error);
    }
  };

  /**
   * Requests product configuration (e.g., 'route') for a Linked Account.
   * API Doc: https://razorpay.com/docs/api/payments/route/request-product-config/
   * @param {string} accountId - The Razorpay Linked Account ID (acc_...).
   * @param {string} productName - The product to request (e.g., 'route').
   * @returns {Promise<object>} The product configuration object.
   */
  requestProductConfiguration = async (accountId, productName = 'route') => {
    try {
      const url = `${this.RZP_V2_BASE_URL}/accounts/${accountId}/products`;
      const data = { product_name: productName, tnc_accepted: true };
      return await this.makeRazorpayRequest('POST', url, data);
    } catch (error) {
      console.error('Error requesting product configuration:', error);
      throw new Error('Failed to request product configuration');
    }
  };

  /**
   * Updates product configuration, used to submit bank/KYC details.
   * API Doc: https://razorpay.com/docs/api/payments/route/update-product-config/
   * API Doc (Settlements): https://razorpay.com/docs/api/partners/product-configuration/update-settlement-account-details/
   * @param {string} accountId - The Razorpay Linked Account ID (acc_...).
   * @param {string} productId - The Razorpay Product ID (acc_prd_...).
   * @param {object} updateData - Data containing settlements object and other KYC fields.
   * @returns {Promise<object>} The updated product configuration object.
   */
  updateProductConfiguration = async (
    accountId,
    productId,
    updateData: { tnc_accepted: boolean },
  ) => {
    const url = `${this.RZP_V2_BASE_URL}/accounts/${accountId}/products/${productId}`;
    if (!updateData.tnc_accepted) {
      updateData.tnc_accepted = true;
    }
    console.log('Update Data Body....:', updateData);

    return await this.makeRazorpayRequest('PATCH', url, updateData);
  };
}
