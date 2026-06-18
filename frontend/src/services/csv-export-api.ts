import {
  ApiError,
  apiUrl,
  authHeaders,
  errorPayload,
} from '@/services/api-client'

export type CsvExportResult = {
  blob: Blob
  filename: string
  truncated: boolean
}

function sanitizeFilename(value: string) {
  const printableValue = [...value]
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code > 31 && code !== 127
    })
    .join('')
  const filename = printableValue
    .replaceAll(/[/\\?%*:|"<>]/g, '-')
    .trim()
    .slice(0, 180)

  return filename.toLowerCase().endsWith('.csv')
    ? filename
    : `${filename || 'soc-search-export'}.csv`
}

function decodeFilenameStar(value: string) {
  const encoded = value.replace(/^UTF-8''/i, '')
  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

function filenameFromDisposition(
  disposition: string | null,
  queryId: string,
) {
  if (disposition) {
    const filenameStar = disposition.match(
      /filename\*\s*=\s*([^;]+)/i,
    )?.[1]
    if (filenameStar) {
      return sanitizeFilename(
        decodeFilenameStar(filenameStar.trim().replace(/^"|"$/g, '')),
      )
    }

    const filename = disposition.match(
      /filename\s*=\s*(?:"([^"]+)"|([^;]+))/i,
    )
    const value = filename?.[1] ?? filename?.[2]
    if (value) {
      return sanitizeFilename(value.trim())
    }
  }

  return `soc-search-${queryId}.csv`
}

export async function exportSearchCsv(
  queryId: string,
  signal?: AbortSignal,
): Promise<CsvExportResult> {
  let response: Response

  try {
    response = await fetch(
      apiUrl(`/api/v1/search/${encodeURIComponent(queryId)}/export.csv`),
      {
        signal,
        headers: {
          Accept: 'text/csv, application/json',
          ...authHeaders(),
        },
      },
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ApiError({
      status: 0,
      message: 'Unable to connect to the CSV export endpoint',
      errors: ['Check that the backend and Docker services are running'],
      cause: error,
    })
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''
    let payload: unknown = null
    if (contentType.includes('application/json')) {
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
    }
    const parsed = errorPayload(payload)
    throw new ApiError({
      status: response.status,
      message:
        payload === null
          ? 'CSV export could not be completed'
          : parsed.message,
      errors: parsed.errors,
    })
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(
      response.headers.get('content-disposition'),
      queryId,
    ),
    truncated:
      response.headers.get('x-export-truncated')?.toLowerCase() ===
      'true',
  }
}

export function downloadCsvBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = sanitizeFilename(filename)
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
