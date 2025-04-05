import { Injectable } from '@nestjs/common';

interface ExchangeRates {
  [currency: string]: number;
}

@Injectable()
export class CurrencyConversionService {
  private readonly exchangeRates: ExchangeRates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    INR: 83.12,
    JPY: 151.45,
  };

  convertToBaseCurrency(amount: number, fromCurrency: string): number {
    const rate = this.exchangeRates[fromCurrency] || 1;
    return amount / rate;
  }

  convertFromBaseCurrency(amount: number, toCurrency: string): number {
    const rate = this.exchangeRates[toCurrency] || 1;
    return amount * rate;
  }

  convert(amount: number, fromCurrency: string, toCurrency: string): number {
    const baseAmount = this.convertToBaseCurrency(amount, fromCurrency);
    return this.convertFromBaseCurrency(baseAmount, toCurrency);
  }
}
