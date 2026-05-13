import { useState } from 'react'
import { supabase } from '../supabaseClient'

const ExcelAnalysis = () => {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null
    setFile(selected)
    setError('')
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!file) {
      setError('Selecciona un archivo Excel primero.')
      return
    }

    setLoading(true)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError

      const token = sessionData?.session?.access_token
      if (!token) {
        throw new Error('No hay sesión activa.')
      }

      const formData = new FormData()
      formData.append('excel', file)

      const response = await fetch('/api/upload-excel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      const contentType = response.headers.get('content-type') || ''
      let payload = null
      if (contentType.toLowerCase().includes('application/json')) {
        payload = await response.json()
      } else {
        const textPayload = await response.text()
        payload = { error: textPayload || 'Respuesta no JSON del servidor.' }
      }

      if (!response.ok) {
        throw new Error(payload?.error || 'Error subiendo archivo.')
      }

      setResult(payload?.data || null)
    } catch (err) {
      setError(err.message || 'Error procesando archivo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Análisis de Excel</h1>

      <form onSubmit={handleUpload} className="bg-white rounded-xl shadow p-4 space-y-4">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="block w-full"
        />

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-primary-600 text-white disabled:opacity-60"
        >
          {loading ? 'Procesando...' : 'Subir y analizar'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 rounded bg-red-100 text-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-medium mb-2">Resultado guardado</h2>
          <pre className="text-sm overflow-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default ExcelAnalysis
