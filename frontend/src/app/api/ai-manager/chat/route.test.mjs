import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const routePath = new URL('./route.ts', import.meta.url)
const source = fs.readFileSync(routePath, 'utf8')

test('AI manager route should enforce auth header check', () => {
  assert.match(source, /authorization/i)
  assert.match(source, /status:\s*401/)
})

test('AI manager route should reject missing auth', () => {
  assert.match(source, /if\s*\(!authHeader\)/)
})
