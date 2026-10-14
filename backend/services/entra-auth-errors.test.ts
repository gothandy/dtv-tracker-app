import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  appDisabledMessage,
  ENTRA_SECRET_UPDATE_MESSAGE,
  isClientCredentialsAuthError,
  mapClientCredentialsAuthError,
} from './entra-auth-errors'

describe('mapClientCredentialsAuthError', () => {
  it('maps expired client secret (AADSTS7000222)', () => {
    const error = {
      response: {
        data: {
          error: 'invalid_client',
          error_description:
            "AADSTS7000222: The provided client secret keys for app '267fb092-69c0-48ea-b197-67b79dd4bc92' are expired.",
        },
      },
    }
    expect(mapClientCredentialsAuthError(error)).toBe(ENTRA_SECRET_UPDATE_MESSAGE)
  })

  it('maps invalid client secret (AADSTS7000215)', () => {
    const error = {
      response: {
        data: {
          error_description: 'AADSTS7000215: Invalid client secret provided.',
        },
      },
    }
    expect(mapClientCredentialsAuthError(error)).toBe(ENTRA_SECRET_UPDATE_MESSAGE)
  })

  it('maps a switched-off app (AADSTS7000112), naming the environment', () => {
    vi.stubEnv('TRACKER_SHAREPOINT_SITE_URL', 'https://dtvolunteers.sharepoint.com/sites/tracker-preview')
    const error = {
      response: {
        data: {
          error: 'unauthorized_client',
          error_description: "AADSTS7000112: Application 'f5e30f0a' (DTV Tracker (Preview)) is disabled.",
        },
      },
    }
    expect(mapClientCredentialsAuthError(error)).toBe(appDisabledMessage())
    expect(appDisabledMessage()).toBe(
      'DTV Tracker (Preview) is not enabled for users to sign-in. This happens each night as an extra security precaution. ' +
      'Ask your admin to activate the Entra ID Enterprise Application via properties.',
    )
    expect(isClientCredentialsAuthError(new Error(appDisabledMessage()))).toBe(true)
    vi.unstubAllEnvs()
  })

  it('falls back for other auth failures', () => {
    const error = {
      response: {
        data: {
          error_description: 'AADSTS700016: Application not found in the directory.',
        },
      },
    }
    expect(mapClientCredentialsAuthError(error)).toBe('Failed to authenticate with SharePoint')
  })

  it('falls back when there is no response body', () => {
    expect(mapClientCredentialsAuthError(new Error('network down'))).toBe(
      'Failed to authenticate with SharePoint',
    )
  })
})

describe('isClientCredentialsAuthError', () => {
  it('recognises the mapped secret-update message', () => {
    expect(isClientCredentialsAuthError(new Error(ENTRA_SECRET_UPDATE_MESSAGE))).toBe(true)
  })

  it('recognises AADSTS7000215 axios payloads', () => {
    expect(
      isClientCredentialsAuthError({
        response: { data: { error_description: 'AADSTS7000215: Invalid client secret provided.' } },
      }),
    ).toBe(true)
  })

  it('ignores unrelated errors', () => {
    expect(isClientCredentialsAuthError(new Error('Failed to retrieve SharePoint site ID from Microsoft Graph'))).toBe(
      false,
    )
  })
})
