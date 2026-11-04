import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PERMISSIONS } from '../../types/permissions'

interface RouteInfo { method: string; path: string; permissions: string[] }

/** Every route on a router, with the permissions its handlers check (requirePermission). */
function listRoutes(router: any): RouteInfo[] {
  const routes: RouteInfo[] = []
  for (const layer of router.stack ?? []) {
    if (layer.route) {
      const permissions = layer.route.stack
        .map((l: any) => l.handle?.permission)
        .filter((p: unknown): p is string => typeof p === 'string')
      for (const method of Object.keys(layer.route.methods)) {
        routes.push({ method: method.toUpperCase(), path: String(layer.route.path), permissions })
      }
    } else if (layer.handle?.stack) {
      routes.push(...listRoutes(layer.handle))
    }
  }
  return routes
}

/** The route modules api.ts mounts, read from its source (it uses `import = require`, which Vitest can't load). */
function apiRouteModules(): string[] {
  const source = readFileSync(join(__dirname, 'api.ts'), 'utf8')
  return [...source.matchAll(/require\('\.\/([\w-]+)'\)/g)].map(m => m[1])
}

describe('route permissions', async () => {
  const routes: RouteInfo[] = []
  for (const name of apiRouteModules()) {
    const mod: any = await import(/* @vite-ignore */ `./${name}.ts`)
    routes.push(...listRoutes(mod.default ?? mod))
  }
  const recordsRoutes = routes.filter(r => r.path.includes('records'))

  it('finds the Records routes', () => {
    expect(recordsRoutes.map(r => `${r.method} ${r.path}`)).toContain('PATCH /records/:id')
    expect(recordsRoutes.length).toBeGreaterThanOrEqual(7)
  })

  it('gives every Records route a permission from the permissions table', () => {
    const missing = recordsRoutes
      .filter(r => r.permissions.length === 0 || r.permissions.some(p => !(p in PERMISSIONS)))
      .map(r => `${r.method} ${r.path}`)
    expect(missing).toEqual([])
  })
})
