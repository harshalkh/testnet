import { Cradle, createContainer } from '@/createContainer'
import { env } from '@/config/env'
import { createApp, TestApp } from '@/tests/app'
import { Knex } from 'knex'
import { truncateTables } from '@shared/backend/tests'
import type { AuthService } from '@/auth/service'
import { faker } from '@faker-js/faker'
import { AwilixContainer } from 'awilix'
import { GateHubService } from '@/gatehub/service'
import { loginUser } from '../utils'
import { User } from '@/user/model'
import { IWebhookDate } from '@/gatehub/types'
import { GateHubClient } from '@/gatehub/client'

describe('GateHub Service', (): void => {
  let bindings: AwilixContainer<Cradle>
  let appContainer: TestApp
  let knex: Knex
  let authService: AuthService
  let gateHubService: GateHubService
  let user: User

  const mockGateHubClient = {
    getIframeUrl: jest.fn(),
    handleWebhook: jest.fn(),
    addUserToGateway: jest.fn(),
    createManagedUser: jest.fn(),
    createWallet: jest.fn(),
    connectUserToGateway: jest.fn(),
    getWalletBalance: jest.fn(),
    getUserState: jest.fn()
  }

  beforeAll(async (): Promise<void> => {
    bindings = await createContainer(env)
    appContainer = await createApp(bindings)
    knex = appContainer.knex
    authService = await bindings.resolve('authService')
    gateHubService = await bindings.resolve('gateHubService')
  })

  afterEach(async (): Promise<void> => {
    await truncateTables(knex)
    jest.resetAllMocks()
  })

  afterAll(async (): Promise<void> => {
    await appContainer.stop()
    await knex.destroy()
  })
  beforeEach(async (): Promise<void> => {
    Reflect.set(
      gateHubService,
      'gateHubClient',
      mockGateHubClient as unknown as GateHubClient
    )

    const extraUserArgs = {
      isEmailVerified: true,
      gateHubUserId: 'mocked'
    }

    const resp = await loginUser({
      authService,
      extraUserArgs
    })

    user = resp.user
  })

  describe('Get Iframe Url', () => {
    it('should return Iframe Url ', async () => {
      const mockedIframeUrl = 'URL'
      mockGateHubClient.getIframeUrl.mockResolvedValue(mockedIframeUrl)

      const result = await gateHubService.getIframeUrl('withdrawal', user.id)
      expect(result).toMatch(mockedIframeUrl)
    })

    it('should return NotFound if no user found', async () => {
      await expect(
        gateHubService.getIframeUrl('withdrawal', faker.string.uuid())
      ).rejects.toThrowError(/Not Found/)
    })
    it('should return NotFound if gateHubUserId not found', async () => {
      await User.query().findById(user.id).patch({
        gateHubUserId: ''
      })
      await expect(
        gateHubService.getIframeUrl('withdrawal', user.id)
      ).rejects.toThrowError(/Not Found/)
    })
  })

  describe('handle Webhook', () => {
    it('should mark User As Verified ', async () => {
      const mockData: IWebhookDate = {
        uuid: faker.string.uuid(),
        timestamp: Date.now().toString(),
        event_type: 'id.verification.accepted',
        user_uuid: 'mocked',
        environment: 'sandbox',
        data: {}
      }
      await gateHubService.handleWebhook(mockData)

      const userData = await User.query().findById(user.id)
      expect(userData?.kycVerified).toBe(true)
    })

    it('sending a different verification event should not mark User As Verified ', async () => {
      const mockData: IWebhookDate = {
        uuid: faker.string.uuid(),
        timestamp: Date.now().toString(),
        event_type: 'id.verification.error',
        user_uuid: 'mocked',
        environment: 'sandbox',
        data: {}
      }
      await gateHubService.handleWebhook(mockData)
      const userData = await User.query().findById(user.id)
      expect(userData?.kycVerified).toBe(false)
    })

    it('sending a wrong gateHubId will throw a User Not found exception ', async () => {
      const mockData: IWebhookDate = {
        uuid: faker.string.uuid(),
        timestamp: Date.now().toString(),
        event_type: 'id.verification.accepted',
        user_uuid: faker.string.uuid(),
        environment: 'sandbox',
        data: {}
      }

      await expect(gateHubService.handleWebhook(mockData)).rejects.toThrowError(
        /User not found/
      )
    })
  })

  describe('add User To Gateway', () => {
    it('should set user as KYC verified', async () => {
      const mockedConnectUserToGatewayResponse = true
      mockGateHubClient.connectUserToGateway.mockResolvedValue(
        mockedConnectUserToGatewayResponse
      )
      const mockedGetUserStateResponse = {
        profile: {
          last_name: user.lastName,
          first_name: user.firstName,
          address_country_code: false,
          address_street1: false,
          address_street2: false,
          address_city: false
        }
      }
      mockGateHubClient.getUserState.mockResolvedValue(
        mockedGetUserStateResponse
      )
      const result = await gateHubService.addUserToGateway(user.id)

      expect(result).toBe(mockedConnectUserToGatewayResponse)

      const userData = await User.query().findById(user.id)
      expect(userData?.kycVerified).toBe(true)
    })
    it('should not set user as KYC verified as gateHubService.connectUserToGateway will return false', async () => {
      const mockedConnectUserToGatewayResponse = false
      mockGateHubClient.connectUserToGateway.mockResolvedValue(
        mockedConnectUserToGatewayResponse
      )
      const mockedGetUserStateResponse = {
        profile: {
          last_name: user.lastName,
          first_name: user.firstName,
          address_country_code: false,
          address_street1: false,
          address_street2: false,
          address_city: false
        }
      }
      mockGateHubClient.getUserState.mockResolvedValue(
        mockedGetUserStateResponse
      )
      const result = await gateHubService.addUserToGateway(user.id)

      expect(result).toBe(mockedConnectUserToGatewayResponse)

      const userData = await User.query().findById(user.id)
      expect(userData?.kycVerified).toBe(false)
    })
    it('should return Not Found if user not found', async () => {
      await expect(
        gateHubService.addUserToGateway(faker.string.uuid())
      ).rejects.toThrowError(/Not Found/)
    })
    it('should return Not Found if user has no gateHubUserId field set', async () => {
      await User.query().findById(user.id).patch({
        gateHubUserId: ''
      })
      await expect(
        gateHubService.addUserToGateway(user.id)
      ).rejects.toThrowError(/Not Found/)
    })
  })
})
