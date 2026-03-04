import ru from '@/dictionaries/ru'
import en from '@/dictionaries/en'
import kz from '@/dictionaries/kz'

export const locales = ['ru', 'en', 'kz'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'ru'

export type Dictionary = typeof ru

const dictionaries: Record<string, Dictionary> = { ru, en, kz }

export function getDictionary(locale: string): Dictionary {
  return dictionaries[locale] ?? dictionaries.ru
}

/** Kazakh ISO 639-1 code */
export function toHtmlLang(locale: string): string {
  if (locale === 'kz') return 'kk'
  return locale
}
