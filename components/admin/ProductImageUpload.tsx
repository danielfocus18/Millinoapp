'use client'
import { useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'

interface ProductImageUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  size?: number
}

export function ProductImageUpload({ value, onChange, size = 96 }: ProductImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please choose an image file'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }

    setUploading(true); setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) { setError(data.error); setUploading(false); return }
      onChange(data.url)
    } catch {
      setError('Upload failed — check your connection')
    }
    setUploading(false)
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
    setError('')
  }

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          width: size, height: size, borderRadius: 14,
          border: value ? '1.5px solid var(--border)' : '1.5px dashed var(--border-2)',
          background: value ? 'var(--surface)' : '#FAFAFA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: uploading ? 'wait' : 'pointer', position: 'relative',
          overflow: 'hidden', flexShrink: 0, transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => { if (!value) (e.currentTarget as HTMLElement).style.borderColor = 'var(--orange)' }}
        onMouseLeave={e => { if (!value) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)' }}
      >
        {uploading ? (
          <Loader2 size={22} className="animate-spin" color="var(--text-3)" />
        ) : value ? (
          <>
            {/* Fixed-size cropped preview — every image fits identically regardless of source dimensions */}
            <img src={value} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <button
              onClick={handleRemove}
              type="button"
              style={{
                position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 999,
                background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--text-3)' }}>
            <ImagePlus size={22} strokeWidth={1.75} />
            <span style={{ fontSize: '0.62rem', fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>Add Photo</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      {error && (
        <div style={{ fontSize: '0.7rem', color: 'var(--red)', marginTop: 6, maxWidth: size + 40, fontWeight: 600 }}>
          {error}
        </div>
      )}
    </div>
  )
}
