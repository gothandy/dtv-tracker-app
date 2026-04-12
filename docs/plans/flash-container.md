# Plan: Refactor FlashMessage → FlashContainer (#111)

Centralise all flash state into `FlashContainer.vue`, make `FlashMessage` a pure presentational component, enforce page-scoped message lifetime, and add focus/blur-dismiss behaviour.

## Files

| File | Action |
|------|--------|
| `frontend/src/composables/useFlash.ts` | Delete |
| `frontend/src/components/FlashMessageContainer.vue` | Delete (replaced) |
| `frontend/src/components/FlashContainer.vue` | Create |
| `frontend/src/components/FlashMessage.vue` | Rewrite |
| `frontend/src/layouts/DefaultLayout.vue` | Update |
| `frontend/src/layouts/TaskLayout.vue` | Update |
| `frontend/src/pages/sandbox/SandboxFlashMessage.vue` | Update |
| `routes/auth/index.ts` | Update — `name=` → `flashName=` |

## API

```html
<FlashContainer :params="['flashName']" v-slot="{ flashKey, params, dismiss }">
  <FlashMessage :show="flashKey === 'signed-out'" type="neutral" @dismiss="dismiss">
    Goodbye, {{ params.flashName || 'there' }}.
  </FlashMessage>
</FlashContainer>
```

## Key behaviours

- `FlashContainer` owns all state; layouts use scoped slot only
- Route-path watcher clears message on navigation (page-scoped lifetime)
- `FlashMessage` auto-focuses after enter transition (`@after-enter`)
- Blur-to-dismiss: 200 ms delay; cancelled if focus returns to message
