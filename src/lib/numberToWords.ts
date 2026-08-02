// Utility to convert numeric amounts to currency words for quotations & invoices

const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

function convertLessThanThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ones[n];
  if (n < 100) {
    return (tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')).trim();
  }
  return (ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 !== 0 ? ' AND ' + convertLessThanThousand(n % 100) : '')).trim();
}

export function numberToWords(amount: number, currency: string = 'MYR'): string {
  if (amount === 0) return `ZERO ${currency}`;

  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);

  let words = '';

  if (integerPart >= 1000000) {
    const millions = Math.floor(integerPart / 1000000);
    words += convertLessThanThousand(millions) + ' MILLION ';
  }

  const remainderMillions = integerPart % 1000000;
  if (remainderMillions >= 1000) {
    const thousands = Math.floor(remainderMillions / 1000);
    words += convertLessThanThousand(thousands) + ' THOUSAND ';
  }

  const remainderThousands = remainderMillions % 1000;
  if (remainderThousands > 0) {
    words += convertLessThanThousand(remainderThousands);
  }

  words = words.trim();

  // Currency specific naming
  let currencySuffix = 'RINGGITS ONLY';
  if (currency === 'USD') currencySuffix = 'US DOLLARS ONLY';
  else if (currency === 'SGD') currencySuffix = 'SINGAPORE DOLLARS ONLY';
  else if (currency === 'EUR') currencySuffix = 'EUROS ONLY';
  else if (currency === 'MYR') currencySuffix = 'RINGGITS ONLY';
  else currencySuffix = `${currency} ONLY`;

  if (decimalPart > 0) {
    const decimalWords = convertLessThanThousand(decimalPart);
    return `${words} ${currency} AND ${decimalWords} CENTS ONLY`;
  }

  return `${words} ${currencySuffix}`.toUpperCase();
}
