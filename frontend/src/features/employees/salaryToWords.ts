const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

// 0–99 in words, e.g. 79 -> "seventy-nine".
function underHundred(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  return ones ? `${tens}-${ones}` : tens;
}

// 0–999 in words, e.g. 456 -> "four hundred fifty-six".
function underThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} hundred`);
  if (rest) parts.push(underHundred(rest));
  return parts.join(' ');
}

// International grouping (thousand, million, …), e.g. 120000 -> "one hundred twenty thousand".
function internationalWords(n: number): string {
  const scales = ['', ' thousand', ' million', ' billion'];
  const parts: string[] = [];
  let scale = 0;
  while (n > 0) {
    const group = n % 1000;
    if (group) parts.unshift(underThousand(group) + scales[scale]);
    n = Math.floor(n / 1000);
    scale += 1;
  }
  return parts.join(' ');
}

// Indian grouping: crore (1,00,00,000), lakh (1,00,000), thousand, then hundreds.
// crore can be any size (e.g. "four hundred sixty-two crore"), so it uses the
// general converter; lakh and thousand are always 0–99.
// e.g. 1700000 -> "seventeen lakh".
function indianWords(n: number): string {
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundreds = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${internationalWords(crore)} crore`);
  if (lakh) parts.push(`${underHundred(lakh)} lakh`);
  if (thousand) parts.push(`${underHundred(thousand)} thousand`);
  if (hundreds) parts.push(underThousand(hundreds));
  return parts.join(' ');
}

// Currency word, and whether that currency reads in the Indian number system.
const CURRENCY_WORDS: Record<string, { name: string; indian?: boolean }> = {
  INR: { name: 'rupees', indian: true },
  USD: { name: 'dollars' },
  GBP: { name: 'pounds' },
  EUR: { name: 'euros' },
  SGD: { name: 'Singapore dollars' },
};

// Spells out a salary the way its country reads it, e.g.
// salaryToWords('1700000', 'INR') -> 'Seventeen lakh rupees'
// salaryToWords('120000', 'USD')  -> 'One hundred twenty thousand dollars'
export function salaryToWords(amount: string, currency: string): string {
  const value = Math.round(Number(amount));
  const info = CURRENCY_WORDS[currency] ?? { name: currency };
  const words = value === 0 ? 'zero' : info.indian ? indianWords(value) : internationalWords(value);
  const phrase = `${words} ${info.name}`;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
