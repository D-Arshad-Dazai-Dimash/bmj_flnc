'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { getDictionary, toHtmlLang, type Dictionary } from '@/lib/i18n'

interface LangContextValue {
  lang: string
  t: Dictionary
}

const LangContext = createContext<LangContextValue>({
  lang: 'ru',
  t: getDictionary('ru'),
})

export function LangProvider({ lang, children }: { lang: string; children: ReactNode }) {
  const t = getDictionary(lang)

  /* Set <html lang="kk|ru|en"> on the client */
  useEffect(() => {
    document.documentElement.lang = toHtmlLang(lang)
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
