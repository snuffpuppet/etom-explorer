export interface ProcessNode {
  id: string
  name: string
  level: number
  brief_description: string | null
  extended_description: string | null
  domain: string | null
  vertical_group: string | null
  original_id: string | null
  uid: string | null
  parent_id: string | null
  children: ProcessNode[]
}
