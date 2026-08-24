// Placeholder for Supabase integration
// This file can be replaced with actual Supabase client when needed
// For now, using local SQLite database as the primary data source

export const supabase = {
  // Placeholder methods to prevent errors in drawer component
  from: (table: string) => ({
    select: (columns: string) => ({
      limit: (n: number) => Promise.resolve({ data: [], error: null }),
      eq: (field: string, value: any) => ({
        single: () => Promise.resolve({ data: null, error: null })
      })
    })
  })
};