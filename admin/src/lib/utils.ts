import { APP_NAME } from '@/config/constants'
import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function withAppPrefix(str: string) {
  return `${APP_NAME.toUpperCase().split(' ').join('_')}:${str}`
}
