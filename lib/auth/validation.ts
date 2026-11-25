export interface RegisterCustomerInput {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}

export interface CustomerRegistrationFieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  agreeTerms?: string;
  general?: string;
}

export interface RegisterActionResult {
  success: boolean;
  errors?: CustomerRegistrationFieldErrors;
  email?: string;
}

export interface ValidatedCustomerData {
  fullName: string;
  email: string;
  canonicalPhone: string;
  password: string;
}

export interface RegisterVendorInput {
  ownerName: string;
  businessEmail: string;
  registeredMobile: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}

export interface VendorRegistrationFieldErrors {
  ownerName?: string;
  businessEmail?: string;
  registeredMobile?: string;
  password?: string;
  confirmPassword?: string;
  agreeTerms?: string;
  general?: string;
}

export interface RegisterVendorActionResult {
  success: boolean;
  errors?: VendorRegistrationFieldErrors;
  email?: string;
}

export interface ValidatedVendorData {
  ownerName: string;
  businessEmail: string;
  canonicalMobile: string;
  password: string;
}

/**
 * Normalizes email address to lowercase and trimmed string.
 */
export function normalizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes and validates an Indian mobile number.
 * Formats valid 10-digit Indian mobile numbers (starting with 6, 7, 8, or 9)
 * to canonical E.164 representation: +91XXXXXXXXXX.
 */
export function normalizeIndianPhone(rawPhone: string): {
  valid: boolean;
  canonicalPhone?: string;
  error?: string;
} {
  if (typeof rawPhone !== 'string' || !rawPhone.trim()) {
    return {
      valid: false,
      error: 'Please enter your mobile number.',
    };
  }

  // Strip common phone delimiters: spaces, dashes, dots, parentheses
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');

  // Normalize prefix variations (+91, 91, or leading 0)
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // Validate 10-digit Indian mobile range: starts with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(cleaned)) {
    return {
      valid: false,
      error: 'Please enter a valid 10-digit Indian mobile number.',
    };
  }

  return {
    valid: true,
    canonicalPhone: `+91${cleaned}`,
  };
}

/**
 * Standard RFC-compliant email regex.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates customer registration payload on the server.
 * Never logs passwords or sensitive details.
 */
export function validateCustomerRegistration(input: RegisterCustomerInput): {
  isValid: boolean;
  errors: CustomerRegistrationFieldErrors;
  validatedData?: ValidatedCustomerData;
} {
  const errors: CustomerRegistrationFieldErrors = {};

  // 1. Full Name validation
  const rawName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  if (!rawName) {
    errors.fullName = 'Please enter your full name.';
  } else if (rawName.length < 2) {
    errors.fullName = 'Name must be at least 2 characters.';
  } else if (rawName.length > 100) {
    errors.fullName = 'Name cannot exceed 100 characters.';
  } else if (/[\u0000-\u001F\u007F]/.test(rawName)) {
    errors.fullName = 'Name contains invalid control characters.';
  }

  // 2. Email validation
  const normalizedEmail = normalizeEmail(input.email);
  if (!normalizedEmail) {
    errors.email = 'Please enter your email address.';
  } else if (normalizedEmail.length > 255) {
    errors.email = 'Email address cannot exceed 255 characters.';
  } else if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  // 3. Mobile Number validation
  const phoneValidation = normalizeIndianPhone(input.mobileNumber);
  if (!phoneValidation.valid || !phoneValidation.canonicalPhone) {
    errors.phone = phoneValidation.error || 'Please enter a valid 10-digit Indian mobile number.';
  }

  // 4. Password validation
  const rawPassword = typeof input.password === 'string' ? input.password : '';
  if (!rawPassword) {
    errors.password = 'Please create a password.';
  } else if (rawPassword.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (rawPassword.length > 128) {
    errors.password = 'Password cannot exceed 128 characters.';
  }

  // 5. Password Confirmation validation
  const rawConfirm = typeof input.confirmPassword === 'string' ? input.confirmPassword : '';
  if (!rawConfirm) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (rawPassword !== rawConfirm) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  // 6. Terms Acceptance validation
  if (input.termsAccepted !== true) {
    errors.agreeTerms = 'You must accept the Terms of Service & Privacy Policy.';
  }

  const isValid = Object.keys(errors).length === 0;

  if (!isValid) {
    return { isValid, errors };
  }

  return {
    isValid: true,
    errors: {},
    validatedData: {
      fullName: rawName,
      email: normalizedEmail,
      canonicalPhone: phoneValidation.canonicalPhone!,
      password: rawPassword,
    },
  };
}

/**
 * Validates vendor registration payload on the server.
 * Never logs passwords or sensitive details.
 * Never trusts role or status from the client.
 */
export function validateVendorRegistration(input: RegisterVendorInput): {
  isValid: boolean;
  errors: VendorRegistrationFieldErrors;
  validatedData?: ValidatedVendorData;
} {
  const errors: VendorRegistrationFieldErrors = {};

  // 1. Owner Name validation
  const rawOwner = typeof input.ownerName === 'string' ? input.ownerName.trim() : '';
  if (!rawOwner) {
    errors.ownerName = 'Please enter the merchant or owner name.';
  } else if (rawOwner.length < 2) {
    errors.ownerName = 'Owner name must be at least 2 characters.';
  } else if (rawOwner.length > 100) {
    errors.ownerName = 'Owner name cannot exceed 100 characters.';
  } else if (/[\u0000-\u001F\u007F]/.test(rawOwner)) {
    errors.ownerName = 'Owner name contains invalid control characters.';
  }

  // 2. Business Email validation
  const normalizedEmail = normalizeEmail(input.businessEmail);
  if (!normalizedEmail) {
    errors.businessEmail = 'Please enter your business email.';
  } else if (normalizedEmail.length > 255) {
    errors.businessEmail = 'Business email cannot exceed 255 characters.';
  } else if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.businessEmail = 'Please enter a valid business email address.';
  }

  // 3. Registered Mobile validation
  const phoneValidation = normalizeIndianPhone(input.registeredMobile);
  if (!phoneValidation.valid || !phoneValidation.canonicalPhone) {
    errors.registeredMobile = phoneValidation.error || 'Please enter a valid 10-digit Indian mobile number.';
  }

  // 4. Password validation
  const rawPassword = typeof input.password === 'string' ? input.password : '';
  if (!rawPassword) {
    errors.password = 'Please create a password.';
  } else if (rawPassword.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (rawPassword.length > 128) {
    errors.password = 'Password cannot exceed 128 characters.';
  }

  // 5. Password Confirmation validation
  const rawConfirm = typeof input.confirmPassword === 'string' ? input.confirmPassword : '';
  if (!rawConfirm) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (rawPassword !== rawConfirm) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  // 6. Terms Acceptance validation
  if (input.termsAccepted !== true) {
    errors.agreeTerms = 'You must accept the Vendor Marketplace Guidelines and Merchant Service Agreement.';
  }

  const isValid = Object.keys(errors).length === 0;

  if (!isValid) {
    return { isValid, errors };
  }

  return {
    isValid: true,
    errors: {},
    validatedData: {
      ownerName: rawOwner,
      businessEmail: normalizedEmail,
      canonicalMobile: phoneValidation.canonicalPhone!,
      password: rawPassword,
    },
  };
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
  next?: string | null;
}

export interface LoginFieldErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface LoginActionResult {
  success: boolean;
  errors?: LoginFieldErrors;
  redirectTo?: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ForgotPasswordFieldErrors {
  email?: string;
  general?: string;
}

export interface ForgotPasswordActionResult {
  success: boolean;
  errors?: ForgotPasswordFieldErrors;
  message?: string;
}

export interface ResetPasswordInput {
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordFieldErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export interface ResetPasswordActionResult {
  success: boolean;
  errors?: ResetPasswordFieldErrors;
  message?: string;
}

/**
 * Validates login payload on the server.
 * Never logs passwords or sensitive details.
 */
export function validateLoginInput(input: LoginInput): {
  isValid: boolean;
  errors: LoginFieldErrors;
  normalizedEmail: string;
} {
  const errors: LoginFieldErrors = {};
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    errors.email = 'Please enter your email address.';
  } else if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  const rawPassword = typeof input.password === 'string' ? input.password : '';
  if (!rawPassword) {
    errors.password = 'Please enter your password.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalizedEmail,
  };
}

/**
 * Validates forgot password payload on the server.
 * Ensures email format is syntactically valid without leaking account existence.
 */
export function validateForgotPasswordInput(input: ForgotPasswordInput): {
  isValid: boolean;
  errors: ForgotPasswordFieldErrors;
  normalizedEmail: string;
} {
  const errors: ForgotPasswordFieldErrors = {};
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    errors.email = 'Please enter your email address.';
  } else if (normalizedEmail.length > 255) {
    errors.email = 'Email address cannot exceed 255 characters.';
  } else if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalizedEmail,
  };
}

/**
 * Validates reset password payload on the server.
 * Never logs passwords or sensitive details.
 */
export function validateResetPasswordInput(input: ResetPasswordInput): {
  isValid: boolean;
  errors: ResetPasswordFieldErrors;
} {
  const errors: ResetPasswordFieldErrors = {};

  const rawPassword = typeof input.password === 'string' ? input.password : '';
  if (!rawPassword) {
    errors.password = 'Please enter a new password.';
  } else if (rawPassword.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (rawPassword.length > 128) {
    errors.password = 'Password cannot exceed 128 characters.';
  }

  const rawConfirm = typeof input.confirmPassword === 'string' ? input.confirmPassword : '';
  if (!rawConfirm) {
    errors.confirmPassword = 'Please confirm your new password.';
  } else if (rawPassword !== rawConfirm) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

