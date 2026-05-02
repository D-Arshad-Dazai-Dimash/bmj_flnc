// ─── supabase.ts — STUB / COMPATIBILITY SHIM ─────────────────────────────────
//
// ВАЖНО: Supabase ПОЛНОСТЬЮ УДАЛЁН из проекта.
// Этот файл — временная заглушка для файлов, которые ещё не переведены
// на .NET API. Все вызовы возвращают пустые данные.
//
// TODO (Неделя 1+): удалить по мере рефакторинга каждой страницы на .NET API.
// ─────────────────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Минимальный mock Supabase-клиента — возвращает пустые данные */
function createMockClient() {
  const noop = () => mockQuery()

  // Chainable query builder
  function mockQuery(): any {
    const q: any = {
      select:    () => q,
      insert:    () => q,
      update:    () => q,
      delete:    () => q,
      upsert:    () => q,
      eq:        () => q,
      neq:       () => q,
      in:        () => q,
      not:       () => q,
      is:        () => q,
      gt:        () => q,
      gte:       () => q,
      lt:        () => q,
      lte:       () => q,
      like:      () => q,
      ilike:     () => q,
      order:     () => q,
      limit:     () => q,
      range:     () => q,
      single:    () => Promise.resolve({ data: null, error: null, count: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then:      (resolve: (v: any) => any) =>
        Promise.resolve({ data: [], error: null, count: null }).then(resolve),
    }
    return q
  }

  return {
    from:  (_table: string) => mockQuery(),
    rpc:   (_fn: string, _args?: any) => Promise.resolve({ data: null, error: null }),
    auth: {
      getUser:          () => Promise.resolve({ data: { user: null }, error: null }),
      getSession:       () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
      signUp:           () => Promise.resolve({ data: {}, error: null }),
      signOut:          () => Promise.resolve({ error: null }),
      onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: noop } } }),
    },
    channel: (_name: string) => ({
      on:        (_type: any, _opts: any, _cb: any) => ({
        subscribe: () => ({ unsubscribe: noop }),
      }),
      subscribe: () => ({ unsubscribe: noop }),
    }),
    removeChannel: noop,
    storage: {
      from: (_bucket: string) => ({
        upload:       () => Promise.resolve({ data: null, error: null }),
        getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
        remove:       () => Promise.resolve({ data: null, error: null }),
      }),
    },
  }
}

/** @deprecated Supabase удалён. Используй fetch() к .NET API с credentials:'include' */
export const createClient = () => createMockClient()

/** @deprecated */
export const createServerClient = (_url: string, _key: string, _opts?: any) => createMockClient()
