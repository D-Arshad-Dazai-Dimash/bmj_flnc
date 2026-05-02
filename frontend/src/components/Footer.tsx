import Link from '@/components/ui/LocaleLink'
import { Github, Twitter } from 'lucide-react'

const links = {
  Платформа:     [['Возможности', '#features'], ['Безопасность', '/safety'], ['Тарифы', '/pricing']],
  Разработчикам: [['Вступить', '/auth?mode=register&type=Developer'], ['Кланы', '/clans'], ['Рейтинг', '#']],
  Бизнесу:       [['Найти команду', '/auth?mode=register&type=Client'], ['Эскроу', '/escrow'], ['Отзывы', '#']],
}

export default function Footer() {
  return (
    <footer className="relative border-t border-border/50 pt-16 pb-8 px-4">
      {/* Top accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <p className="font-bold text-text-base mb-2">Barnamaj</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Профессиональный кодинг.<br />Без лишних слов.
            </p>
            <div className="flex gap-3 mt-4">
              {[Github, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-8 h-8 rounded-lg border border-border hover:border-border-bright flex items-center justify-center text-text-muted hover:text-text-base transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <p className="text-[10px] font-mono font-semibold text-text-faint uppercase tracking-widest mb-4">
                {heading}
              </p>
              <ul className="space-y-2.5">
                {items.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-xs text-text-muted hover:text-text-base transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-border/40 gap-3">
          <p className="text-[11px] text-text-faint">
            © {new Date().getFullYear()} Barnamaj. Все права защищены.
          </p>
          <div className="flex gap-5">
            {['Конфиденциальность', 'Условия'].map(t => (
              <a key={t} href="#" className="text-[11px] text-text-faint hover:text-text-muted transition-colors">
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
