export interface TagDef {
  id: string
  name: string
  colour: string
  description: string
}

export interface TagAssignment {
  node_id: string
  tag_id: string
  cascade: string  // "true" | "false" — stored as string in MD table
}

export interface TeamAssignment {
  node_id: string
  team: string
  function: string
}

export interface SearchResult {
  id: string
  name: string
  level: number
  brief_description?: string
  breadcrumbs: string[]
  ancestor_ids: string[]
}
