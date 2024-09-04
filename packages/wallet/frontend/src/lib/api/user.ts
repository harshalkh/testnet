import { getError } from '../httpClient'
import { z } from 'zod'
import {
  httpClient,
  type ErrorResponse,
  type SuccessResponse
} from '../httpClient'
import { UserResponse, ValidTokenResponse } from '@wallet/shared'

export const signUpSchema = z
  .object({
    email: z.string().email({ message: 'Email is required' }),
    password: z
      .string()
      .min(6, { message: 'Password should be at least 6 characters long' }),
    confirmPassword: z.string()
  })
  .superRefine(({ confirmPassword, password }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords must match',
        path: ['confirmPassword']
      })
    }
  })

export const loginSchema = z.object({
  email: z.string().email({ message: 'Email is required' }),
  password: z.string().min(1, { message: 'Password is required' })
})

export const profileSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' })
})

export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Email is required' })
})

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, { message: 'Password should be at least 6 characters long' }),
    confirmPassword: z.string(),
    token: z.string()
  })
  .superRefine(({ confirmPassword, password }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords must match',
        path: ['confirmPassword']
      })
    }
  })

export const verifyEmailSchema = z.object({
  token: z.string()
})

export const changePasswordSchema = z
  .object({
    oldPassword: z.string(),
    newPassword: z.string().min(6, {
      message: 'Your new password has to be at least 6 characters long.'
    }),
    confirmNewPassword: z.string()
  })
  .superRefine(({ confirmNewPassword, newPassword }, ctx) => {
    if (confirmNewPassword !== newPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords must match.',
        path: ['confirmNewPassword']
      })
    }
  })

const getIframeSrcSchema = z.object({
  type: z.enum(['onboarding', 'ramp'])
})

type SignUpArgs = z.infer<typeof signUpSchema>
type SignUpError = ErrorResponse<SignUpArgs | undefined>
type SignUpResponse = SuccessResponse | SignUpError

type LoginArgs = z.infer<typeof loginSchema>
type LoginError = ErrorResponse<LoginArgs | undefined>
type LoginResponse = SuccessResponse | LoginError

type LogoutResponse = SuccessResponse | ErrorResponse

type ForgotPasswordArgs = z.infer<typeof forgotPasswordSchema>
type ForgotPasswordError = ErrorResponse<ForgotPasswordArgs | undefined>
type ForgotPasswordResponse = SuccessResponse | ForgotPasswordError

type ResetPasswordArgs = z.infer<typeof resetPasswordSchema>
type ResetPasswordError = ErrorResponse<ResetPasswordArgs | undefined>
type ResetPasswordResponse = SuccessResponse | ResetPasswordError

type CheckTokenResult = SuccessResponse<ValidTokenResponse>
type CheckTokenResponse = CheckTokenResult | ErrorResponse

type VerifyEmailArgs = z.infer<typeof verifyEmailSchema>
type VerifyEmailError = ErrorResponse<VerifyEmailArgs | undefined>
type VerifyEmailResponse = SuccessResponse | VerifyEmailError

type MeResult = SuccessResponse<UserResponse>
type MeResponse = MeResult | ErrorResponse

type ProfileArgs = z.infer<typeof profileSchema>
type ProfileError = ErrorResponse<ProfileArgs | undefined>
type ProfileResponse = SuccessResponse | ProfileError

type ChangePasswordArgs = z.infer<typeof changePasswordSchema>
type ChangePasswordError = ErrorResponse<ChangePasswordArgs | undefined>
type ChangePasswordResponse = SuccessResponse | ChangePasswordError

type GetGateHubIframeSrcArgs = z.infer<typeof getIframeSrcSchema>
type GetGateHubIframeSrcResult = SuccessResponse<{ url: string }>
type GetGateHubIframeSrcError = ErrorResponse<
  GetGateHubIframeSrcArgs | undefined
>
type GetGateHubIframeSrcResponse =
  | GetGateHubIframeSrcResult
  | GetGateHubIframeSrcError

interface UserService {
  signUp: (args: SignUpArgs) => Promise<SignUpResponse>
  login: (args: LoginArgs) => Promise<LoginResponse>
  logout: () => Promise<LogoutResponse>
  forgotPassword: (args: ForgotPasswordArgs) => Promise<ForgotPasswordResponse>
  resetPassword: (args: ResetPasswordArgs) => Promise<ResetPasswordResponse>
  checkToken: (token: string, cookies?: string) => Promise<CheckTokenResponse>
  verifyEmail: (args: VerifyEmailArgs) => Promise<VerifyEmailResponse>
  me: (cookies?: string) => Promise<MeResponse>
  updateProfile: (args: ProfileArgs) => Promise<ProfileResponse>
  changePassword: (args: ChangePasswordArgs) => Promise<ChangePasswordResponse>
  getGateHubIframeSrc: (
    args: GetGateHubIframeSrcArgs,
    cookies?: string
  ) => Promise<GetGateHubIframeSrcResponse>
}

const createUserService = (): UserService => ({
  async signUp(args) {
    try {
      const response = await httpClient
        .post('signup', {
          json: args
        })
        .json<SuccessResponse>()
      return response
    } catch (error) {
      return getError<SignUpArgs>(
        error,
        'We could not create your account. Please try again.'
      )
    }
  },

  async login(args) {
    try {
      const response = await httpClient
        .post('login', {
          json: args
        })
        .json<SuccessResponse>()
      return response
    } catch (error) {
      return getError<LoginArgs>(
        error,
        'We could not log you in. Please try again.'
      )
    }
  },

  async logout() {
    try {
      const response = await httpClient
        .post('logout', {
          headers: {}
        })
        .json<SuccessResponse>()
      return response
    } catch (error) {
      return getError(error, 'We could not log you out. Please try again.')
    }
  },

  async forgotPassword(args) {
    try {
      const response = await httpClient
        .post('forgot-password', {
          json: args
        })
        .json<SuccessResponse>()
      return response
    } catch (error) {
      return getError<ForgotPasswordArgs>(
        error,
        'Something went wrong. Please try again.'
      )
    }
  },

  async resetPassword(args) {
    try {
      const response = await httpClient
        .post(`reset-password/${args.token}`, {
          json: args
        })
        .json<SuccessResponse>()
      return response
    } catch (error) {
      return getError<ResetPasswordArgs>(
        error,
        'We could not reset your password. Please try again.'
      )
    }
  },

  async checkToken(token, cookies) {
    try {
      const response = await httpClient
        .get(`reset-password/${token}/validate`, {
          headers: {
            ...(cookies ? { Cookie: cookies } : {})
          }
        })
        .json<CheckTokenResult>()
      return response
    } catch (error) {
      return getError(
        error,
        'Link is invalid. Please try again, or request a new link.'
      )
    }
  },

  async verifyEmail(args) {
    try {
      const response = await httpClient
        .post(`verify-email/${args.token}`, {
          json: args
        })
        .json<SuccessResponse>()
      return response
    } catch (error) {
      return getError(
        error,
        'We could not verify your email. Please try again.'
      )
    }
  },

  async me(cookies) {
    try {
      const response = await httpClient
        .get('me', {
          headers: {
            ...(cookies ? { Cookie: cookies } : {})
          }
        })
        .json<MeResult>()
      return response
    } catch (error) {
      return getError(error, 'Unable to retrive user information.')
    }
  },

  async updateProfile(args) {
    try {
      const response = await httpClient
        .post('updateProfile', {
          json: args
        })
        .json<SuccessResponse>()
      return response
    } catch (error) {
      return getError<ProfileArgs>(
        error,
        'Something went wrong while updating your profile. Please try again.'
      )
    }
  },

  async changePassword(args) {
    try {
      const response = await httpClient
        .patch('change-password', {
          json: args
        })
        .json<SuccessResponse>()
      return response
    } catch (error) {
      return getError<ChangePasswordArgs>(
        error,
        'Something went wrong while changing your password. Please try again.'
      )
    }
  },

  async getGateHubIframeSrc(args, cookies) {
    try {
      const response = await httpClient
        .get(`gatehub/token/${args.type}`, {
          headers: {
            ...(cookies ? { Cookie: cookies } : {})
          }
        })
        .json<GetGateHubIframeSrcResult>()
      return response
    } catch (error) {
      return getError<GetGateHubIframeSrcArgs>(
        error,
        // TODO: Better error message
        'Something went wrong. Please try again.'
      )
    }
  }
})

const userService = createUserService()
export { userService }
