export type ScopeStatus = 'tbd' | 'in_scope' | 'adjacent' | 'out_of_scope' | 'gap'
export type ReviewStatus = 'unreviewed' | 'under_review' | 'classified'

export interface Classification {
  id: string
  name: string
  scope_status: ScopeStatus
  review_status: ReviewStatus
  reason: string
  notes: string
}

export const SCOPE_STATUS_BORDER: Record<ScopeStatus, string> = {
  tbd:          'border-gray-600',
  in_scope:     'border-green-500',
  adjacent:     'border-blue-500',
  out_of_scope: 'border-red-500',
  gap:          'border-amber-500',
}

export const SCOPE_STATUS_DOT: Record<ScopeStatus, string> = {
  tbd:          'bg-gray-600',
  in_scope:     'bg-green-500',
  adjacent:     'bg-blue-500',
  out_of_scope: 'bg-red-500',
  gap:          'bg-amber-500',
}

export const SCOPE_STATUS_LABELS: Record<ScopeStatus, string> = {
  tbd:          'TBD',
  in_scope:     'In Scope',
  adjacent:     'Adjacent',
  out_of_scope: 'Out of Scope',
  gap:          'Gap',
}

export const SCOPE_STATUS_BG: Record<ScopeStatus, string> = {
  tbd:          'bg-gray-600',
  in_scope:     'bg-green-600',
  adjacent:     'bg-blue-600',
  out_of_scope: 'bg-red-600',
  gap:          'bg-amber-600',
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  unreviewed:   'Unreviewed',
  under_review: 'Under Review',
  classified:   'Classified',
}

export const SCOPE_STATUSES: ScopeStatus[] = ['tbd', 'in_scope', 'adjacent', 'out_of_scope', 'gap']
export const REVIEW_STATUSES: ReviewStatus[] = ['unreviewed', 'under_review', 'classified']
