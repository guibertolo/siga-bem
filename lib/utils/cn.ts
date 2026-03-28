/**
 * Utility to conditionally join class names.
 * Lightweight alternative to clsx/classnames for Tailwind CSS usage.
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}
