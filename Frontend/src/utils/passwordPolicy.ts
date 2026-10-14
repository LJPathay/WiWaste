export function getPasswordRules(password: string) {
  return [
    { id: 'length', label: 'At least 8 characters', met: Array.from(password).length >= 8 },
    { id: 'upper', label: 'One uppercase letter', met: /\p{Lu}/u.test(password) },
    { id: 'lower', label: 'One lowercase letter', met: /\p{Ll}/u.test(password) },
    { id: 'number', label: 'One number', met: /\p{N}/u.test(password) },
    { id: 'special', label: 'One special character', met: /[\p{S}\p{P}]/u.test(password) },
    { id: 'max-bytes', label: 'No more than 72 UTF-8 bytes', met: new TextEncoder().encode(password).length <= 72 },
    { id: 'controls', label: 'No tabs, line breaks, or control characters', met: !/[\u0000-\u001F\u007F-\u009F]/.test(password) },
  ];
}

export function isPasswordValid(password: string) {
  return getPasswordRules(password).every(rule => rule.met);
}
