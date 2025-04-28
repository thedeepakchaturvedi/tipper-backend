import { BadRequestException } from '@nestjs/common';

// List of restricted tipper IDs that cannot be used
export const RESTRICTED_TIPPER_IDS = [
  'contact',
  'contacts',
  'contact_us',
  'contact-us',
  'about',
  'about_us',
  'about-us',
  'login',
  'log_in',
  'log-in',
  'register',
  '404',
  'api',
  'cancellation',
  'privacy',
  'refund',
  'terms',
  'docs',
  'documentation',
];

/**
 * Validates if a tipper ID is not in the restricted list
 * @param tipperId - The tipper ID to validate
 * @throws BadRequestException if the tipper ID is restricted
 */
export function validateTipperId(tipperId: string): void {
  const normalizedTipperId = tipperId.toLowerCase().trim();

  if (RESTRICTED_TIPPER_IDS.includes(normalizedTipperId)) {
    throw new BadRequestException(
      `The tipper ID "${tipperId}" is reserved and cannot be used`,
    );
  }
}
