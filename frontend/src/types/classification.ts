export type Category = 'oss' | 'oss_bss' | 'bss' | 'other' | 'unclassified'
export type ReviewStatus = 'unreviewed' | 'under_review' | 'classified' | 'descoped'

export interface Classification {
  id: string
  name: string
  category: Category
  review_status: ReviewStatus
  notes: string
}

export interface DescopedEntry {
  id: string
  name: string
  reason: string
  notes: string
}

export const CATEGORY_COLOURS: Record<Category, string> = {
  oss:          'border-green-500',
  oss_bss:      'border-blue-500',
  bss:          'border-orange-500',
  other:        'border-gray-500',
  unclassified: 'border-gray-600',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  oss:          'OSS',
  oss_bss:      'OSS/BSS',
  bss:          'BSS',
  other:        'Other',
  unclassified: 'Unclassified',
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  unreviewed:   'Unreviewed',
  under_review: 'Under Review',
  classified:   'Classified',
  descoped:     'Descoped',
}
