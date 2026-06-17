export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      [tableName: string]: {
        Row: { [columnName: string]: any }
        Insert: { [columnName: string]: any }
        Update: { [columnName: string]: any }
        Relationships: any[]
      }
    }
    Views: { [viewName: string]: any }
    Functions: { [functionName: string]: any }
    Enums: { [enumName: string]: any }
    CompositeTypes: { [typeName: string]: any }
  }
}