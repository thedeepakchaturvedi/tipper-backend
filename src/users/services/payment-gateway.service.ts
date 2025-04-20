import { Injectable } from '@nestjs/common';

interface PaymentResponse {
  success: boolean;
  paymentId: string;
  error?: string;
}

@Injectable()
export class PaymentGatewayService {
  async createOrder(
    amount: number,
    currency: string,
  ): Promise<PaymentResponse> {
    // Mock payment processing
    // In real implementation, this would call the actual payment gateway API
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 90% success rate
        const success = Math.random() > 0.1;
        if (success) {
          resolve({
            success: true,
            paymentId: `PAY-${Date.now()}-${amount}-${currency}-${Math.random().toString(36).substr(2, 9)}`,
          });
        } else {
          resolve({
            success: false,
            paymentId: '',
            error: `Payment of ${amount} ${currency} failed`,
          });
        }
      }, 1000); // Simulate 1 second processing time
    });
  }
}
