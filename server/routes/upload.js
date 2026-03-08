import { Router } from 'express'
import multer from 'multer'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join, extname } from 'path'
import mammoth from 'mammoth'
import { createRequire } from 'module'
const _require = createRequire(import.meta.url)
const pdfParse = _require('pdf-parse')

const execAsync = promisify(exec)
const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
})

// ── File type detection ───────────────────────────────────────────────────────

const TYPE_MAP = {
  // Text
  'text/plain': 'text',
  'text/markdown': 'text',
  // Word
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
  // PDF
  'application/pdf': 'pdf',
  // Audio
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/ogg': 'audio',
  'audio/wav': 'audio',
  'audio/x-wav': 'audio',
  'audio/m4a': 'audio',
  'audio/aac': 'audio',
  'audio/webm': 'audio',
  // Video
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'video/webm': 'video',
  'video/x-msvideo': 'video',
}

const EXT_MAP = {
  '.txt': 'text', '.md': 'text', '.markdown': 'text',
  '.docx': 'docx', '.doc': 'docx',
  '.pdf': 'pdf',
  '.mp3': 'audio', '.m4a': 'audio', '.ogg': 'audio', '.wav': 'audio', '.aac': 'audio', '.opus': 'audio',
  '.mp4': 'video', '.mov': 'video', '.webm': 'video', '.avi': 'video',
}

function detectType(mimetype, filename) {
  if (TYPE_MAP[mimetype]) return TYPE_MAP[mimetype]
  const ext = extname(filename || '').toLowerCase()
  return EXT_MAP[ext] || 'text'
}

// ── Extractors ────────────────────────────────────────────────────────────────

async function extractText(buffer) {
  return buffer.toString('utf-8')
}

async function extractDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function extractPdf(buffer) {
  const data = await pdfParse(buffer)
  return data.text
}

async function extractAudioVideo(buffer, filename) {
  // Write buffer to tmp file, run whisper, clean up
  const tmpPath = join(tmpdir(), `heybuddy-${Date.now()}${extname(filename || '.ogg')}`)
  await writeFile(tmpPath, buffer)
  try {
    const { stdout } = await execAsync(
      `python3 -c "import whisper,warnings; warnings.filterwarnings('ignore'); m=whisper.load_model('base'); print(m.transcribe('${tmpPath}')['text'])"`,
      { timeout: 120000 }
    )
    return stdout.trim()
  } finally {
    await unlink(tmpPath).catch(() => {})
  }
}

// ── Labels & prompts for the UI ───────────────────────────────────────────────

const TYPE_META = {
  text:  { label: 'text file',        action: 'Reading transcript',        icon: '📄', hint: 'Plain text or markdown transcript' },
  docx:  { label: 'Word document',    action: 'Extracting from Word doc',  icon: '📝', hint: 'Extracted document text' },
  pdf:   { label: 'PDF',              action: 'Parsing PDF',               icon: '📋', hint: 'Extracted PDF text' },
  audio: { label: 'audio recording',  action: 'Transcribing audio',        icon: '🎙️', hint: 'Whisper audio transcription' },
  video: { label: 'video recording',  action: 'Transcribing video audio',  icon: '🎬', hint: 'Whisper video transcription' },
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  const { buffer, mimetype, originalname, size } = req.file
  const fileType = detectType(mimetype, originalname)
  const meta = TYPE_META[fileType] || TYPE_META.text

  try {
    let text
    switch (fileType) {
      case 'docx':  text = await extractDocx(buffer); break
      case 'pdf':   text = await extractPdf(buffer); break
      case 'audio':
      case 'video': text = await extractAudioVideo(buffer, originalname); break
      default:      text = await extractText(buffer)
    }

    if (!text?.trim()) {
      return res.status(422).json({ error: `Could not extract text from ${meta.label}. File may be empty or unsupported.` })
    }

    res.json({
      text,
      filename: originalname,
      size,
      fileType,
      label: meta.label,
      icon: meta.icon,
      hint: meta.hint,
      charCount: text.length,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    })
  } catch (err) {
    console.error('Upload extraction error:', err)
    res.status(500).json({ error: `Failed to extract from ${meta.label}: ${err.message}` })
  }
})

export default router
