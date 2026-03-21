import type { DateValue as IntlDateValue } from '@internationalized/date'
import type { DateRange, DateValue } from 'reka-ui'
import type { AcceptableValue } from 'reka-ui'

export type FormInputValue = string | number

export type FormCheckboxValue = boolean | 'indeterminate' | null

export type FormSwitchValue = boolean | null

export interface FormSelectOption {
  disabled?: boolean
  label: string
  value: AcceptableValue
}

export interface FormMultiSelectOption {
  disabled?: boolean
  label: string
  value: string
}

export type FileUploadItem = File | string

export type FileUploadValue = FileUploadItem | FileUploadItem[] | null

export type AnyDateValue = DateValue | IntlDateValue

export type FormDateValue = AnyDateValue | DateRange | null
