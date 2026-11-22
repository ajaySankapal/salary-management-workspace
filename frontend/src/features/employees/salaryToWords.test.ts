import { salaryToWords } from './salaryToWords';

describe('salaryToWords', () => {
  it('reads INR in the Indian system (lakh / crore)', () => {
    expect(salaryToWords('1700000', 'INR')).toBe('Seventeen lakh rupees');
    expect(salaryToWords('1250000', 'INR')).toBe('Twelve lakh fifty thousand rupees');
    expect(salaryToWords('12300000', 'INR')).toBe('One crore twenty-three lakh rupees');
    // Large totals: hundreds (even thousands) of crore must not break.
    expect(salaryToWords('4622028000', 'INR')).toBe(
      'Four hundred sixty-two crore twenty lakh twenty-eight thousand rupees',
    );
    expect(salaryToWords('15000000000', 'INR')).toBe('One thousand five hundred crore rupees');
  });

  it('reads other currencies in the international system', () => {
    expect(salaryToWords('120000', 'USD')).toBe('One hundred twenty thousand dollars');
    expect(salaryToWords('79000', 'GBP')).toBe('Seventy-nine thousand pounds');
    expect(salaryToWords('75000', 'EUR')).toBe('Seventy-five thousand euros');
  });
});
