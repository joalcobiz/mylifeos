import { CurrencyEntry, CurrencyRateHistory } from '../types';

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

export const DEFAULT_CURRENCIES: CurrencyEntry[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', rateToUSD: 1, source: 'manual', lastUpdated: new Date().toISOString() },
    { code: 'EUR', name: 'Euro', symbol: '€', rateToUSD: 0.92, source: 'manual', lastUpdated: new Date().toISOString() },
    { code: 'GBP', name: 'British Pound', symbol: '£', rateToUSD: 0.79, source: 'manual', lastUpdated: new Date().toISOString() },
    { code: 'COP', name: 'Colombian Peso', symbol: '$', rateToUSD: 4000, source: 'manual', lastUpdated: new Date().toISOString() },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', rateToUSD: 17.5, source: 'manual', lastUpdated: new Date().toISOString() },
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$', rateToUSD: 1.36, source: 'manual', lastUpdated: new Date().toISOString() },
    { code: 'AUD', name: 'Australian Dollar', symbol: '$', rateToUSD: 1.53, source: 'manual', lastUpdated: new Date().toISOString() },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rateToUSD: 149, source: 'manual', lastUpdated: new Date().toISOString() },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', rateToUSD: 0.88, source: 'manual', lastUpdated: new Date().toISOString() },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', rateToUSD: 7.24, source: 'manual', lastUpdated: new Date().toISOString() },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', rateToUSD: 83.5, source: 'manual', lastUpdated: new Date().toISOString() },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rateToUSD: 4.97, source: 'manual', lastUpdated: new Date().toISOString() },
];

export async function fetchExchangeRates(): Promise<Record<string, number> | null> {
    try {
        const response = await fetch(EXCHANGE_RATE_API);
        if (!response.ok) throw new Error('Failed to fetch rates');
        const data = await response.json();
        return data.rates;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        return null;
    }
}

export function createHistoryEntry(
    code: string,
    rateToUSD: number,
    source: 'api' | 'manual',
    updatedBy?: string
): CurrencyRateHistory {
    return {
        id: `rate-${Date.now()}-${code}`,
        date: new Date().toISOString(),
        code,
        rateToUSD,
        source,
        updatedBy
    };
}

export function formatCurrency(amount: number, currencyCode: string, currencies: CurrencyEntry[]): string {
    const currency = currencies.find(c => c.code === currencyCode);
    const symbol = currency?.symbol || '$';
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function convertCurrency(
    amount: number,
    fromCode: string,
    toCode: string,
    currencies: CurrencyEntry[]
): number {
    const fromCurrency = currencies.find(c => c.code === fromCode);
    const toCurrency = currencies.find(c => c.code === toCode);
    
    if (!fromCurrency || !toCurrency) return amount;
    
    const amountInUSD = amount / fromCurrency.rateToUSD;
    return amountInUSD * toCurrency.rateToUSD;
}

export function getCurrencySymbol(code: string, currencies: CurrencyEntry[]): string {
    const currency = currencies.find(c => c.code === code);
    return currency?.symbol || '$';
}
