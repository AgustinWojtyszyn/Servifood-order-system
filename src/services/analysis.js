import { supabase } from '../supabaseClient'

// Analysis History Service
export const analysisService = {
  // Get user's analysis history
  getHistory: async () => {
    const { data, error } = await supabase
      .from('analysis_history')
      .select('id, filename, results, created_at')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Save new analysis result
  saveAnalysis: async (filename, results) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('analysis_history')
      .insert([{
        user_id: user.id,
        filename,
        results
      }])
      .select()
      .single()
    return { data, error }
  },

  // Delete analysis record
  deleteAnalysis: async (id) => {
    const { error } = await supabase
      .from('analysis_history')
      .delete()
      .eq('id', id)
    return { error }
  }
}
