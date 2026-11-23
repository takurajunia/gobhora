// One format for Zimbabwe mobile numbers:
// "0771 234 567", "+263 77 123 4567" and "263771234567" all become "263771234567"
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "263" + digits.slice(1);
  else if (digits.length === 9 && digits.startsWith("7"))
    digits = "263" + digits;
  return /^2637\d{8}$/.test(digits) ? digits : null;
}
