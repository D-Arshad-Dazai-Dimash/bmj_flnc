'use client'

import { Sparkles, Github, Twitter, Linkedin } from 'lucide-react'

const footerLinks = {
  Платформа: ['Возможности', 'Кланы', 'Проекты', 'Рейтинг'],
  Разработчикам: ['Верификация', 'Навыки', 'Поиск проектов', 'Профиль'],
  Заказчикам: ['Найти команду', 'Как это работает', 'Безопасность', 'Тарифы'],
  Компания: ['О нас', 'Блог', 'Карьера', 'Контакты'],
}

export default function Footer() {
  return (
    <footer className="relative border-t border-border pt-16 pb-8 px-4">
      {/* Top accent line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-white">Barnamaj</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Экосистема элитного программирования. Соединяем лучших.
            </p>
            <div className="flex items-center gap-3 mt-5">
              {[Github, Twitter, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-8 h-8 rounded-lg border border-border hover:border-white/20 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-all duration-200 hover:bg-white/5"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-4">
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-border gap-4">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Barnamaj. Все права защищены.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              Конфиденциальность
            </a>
            <a href="#" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              Условия использования
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
