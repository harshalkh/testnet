import { cx, CxOptions } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'
import { AssetOP } from '@wallet/shared'
import { QuoteResponse } from '@wallet/shared'

/**
 * `getObjectKeys` should be used only when we have additional knowledge.
 * If we know that a specific object doesn't have extra properties, the literal
 * type assertion can be safely used.
 */
export const getObjectKeys = Object.keys as <T extends object>(
  obj: T
) => Array<keyof T>

export type FormattedAmount = {
  amount: string
  symbol: string
}

export function cn(...inputs: CxOptions) {
  return twMerge(cx(inputs))
}

export const getCurrencySymbol = (assetCode: string): string => {
  return new Intl.NumberFormat('en-US', {
    currency: assetCode,
    style: 'currency',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  })
    .format(0)
    .replace(/0/g, '')
    .trim()
}

type FormatAmountArgs = AssetOP & {
  value: string
}

export const formatAmount = (args: FormatAmountArgs): FormattedAmount => {
  const { value, assetCode, assetScale } = args
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: assetCode,
    maximumFractionDigits: assetScale,
    minimumFractionDigits: assetScale
  })
  // All assets will have asset scale 9 by default so we treat the amounts as such when formatting
  const maxAssetScale = 9
  const amount = formatter.format(Number(`${value}e-${maxAssetScale}`))
  const symbol = getCurrencySymbol(assetCode)

  return {
    amount,
    symbol
  }
}

type FormatDateArgs = {
  date: string
  time?: boolean
  month?: Intl.DateTimeFormatOptions['month']
}
export const formatDate = ({
  date,
  time = true,
  month = 'short'
}: FormatDateArgs): string => {
  return new Date(date).toLocaleDateString('default', {
    day: '2-digit',
    month,
    year: 'numeric',
    ...(time && { hour: '2-digit', minute: '2-digit' })
  })
}

export const getFee = (quote: QuoteResponse): FormattedAmount => {
  if (quote.fee) {
    return formatAmount({
      assetCode: quote.fee.assetCode,
      assetScale: quote.fee.assetScale,
      value: quote.fee.value.toString()
    })
  }

  const fee =
    BigInt(quote.debitAmount.value) - BigInt(quote.receiveAmount.value)
  return formatAmount({
    assetCode: quote.debitAmount.assetCode,
    assetScale: quote.debitAmount.assetScale,
    value: fee.toString()
  })
}

const FILE_TYPE = {
  TEXT_PLAIN: 'text/plain'
} as const

type FileType = keyof typeof FILE_TYPE

type GenerateAndDownloadFileProps = {
  content: string
  fileName: string
  fileType: FileType
}

export const generateAndDownloadFile = ({
  content,
  fileName,
  fileType
}: GenerateAndDownloadFileProps): void => {
  const blob = new Blob([content], { type: FILE_TYPE[fileType] })
  const anchor = document.createElement('a')

  anchor.download = fileName
  anchor.href = URL.createObjectURL(blob)
  anchor.dataset.downloadurl = [fileType, anchor.download, anchor.href].join(
    ':'
  )
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(anchor.href)
}

export const replaceWalletAddressProtocol = (
  paymentPointer: string
): string => {
  return paymentPointer.indexOf('https://') !== -1
    ? paymentPointer.replace('https://', '$')
    : paymentPointer.indexOf('http://') !== -1
      ? paymentPointer.replace('http://', '$')
      : paymentPointer
}
