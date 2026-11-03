import { useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  LockKeyhole,
  RotateCcw,
  UploadCloud,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { readSheet, type Row } from 'read-excel-file/browser'
import './App.css'

type RoadmapItem = {
  client: string
  initiative: string
  category: string
  priority: string
  status: string
  owner: string
  startDate: string
  targetDate: string
  notes: string
}

type ParsedWorkbook = {
  fileName: string
  clientName: string
  sheetName: string
  items: RoadmapItem[]
}

const FIELD_ALIASES: Record<keyof RoadmapItem, string[]> = {
  client: ['client', 'client name', 'customer', 'customer name', 'organisation', 'organization'],
  initiative: ['initiative', 'project', 'roadmap item', 'action', 'recommendation', 'task', 'title'],
  category: ['category', 'workstream', 'area', 'pillar', 'service'],
  priority: ['priority', 'importance', 'rating'],
  status: ['status', 'stage', 'progress'],
  owner: ['owner', 'responsible', 'assigned to', 'lead'],
  startDate: ['start date', 'start', 'planned start'],
  targetDate: ['target date', 'due date', 'completion date', 'target', 'due'],
  notes: ['notes', 'description', 'detail', 'details', 'comment', 'comments'],
}

const priorityOrder = ['Critical', 'High', 'Medium', 'Low', 'Unspecified']

function normaliseHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function cleanValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleDateString('en-GB')
  }
  return String(value ?? '').trim()
}

function findValue(row: Record<string, unknown>, field: keyof RoadmapItem) {
  const matchingKey = Object.keys(row).find((key) =>
    FIELD_ALIASES[field].includes(normaliseHeader(key)),
  )
  return matchingKey ? cleanValue(row[matchingKey]) : ''
}

function normalisePriority(value: string) {
  const priority = value.toLowerCase()
  if (priority.includes('critical') || priority === '1') return 'Critical'
  if (priority.includes('high') || priority === '2') return 'High'
  if (priority.includes('medium') || priority.includes('med') || priority === '3') return 'Medium'
  if (priority.includes('low') || priority === '4') return 'Low'
  return value || 'Unspecified'
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const nextCharacter = text[index + 1]
    if (character === '"' && quoted && nextCharacter === '"') {
      value += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') index += 1
      row.push(value)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      value = ''
    } else {
      value += character
    }
  }

  row.push(value)
  if (row.some((cell) => cell.trim())) rows.push(row)
  return rows
}

async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  try {
    const sheetRows: Row[] = file.name.toLowerCase().endsWith('.csv')
      ? parseCsv(await file.text())
      : await readSheet(file)
    if (!sheetRows.length) throw new Error('The workbook does not contain any rows.')
    const headers = sheetRows[0].map(cleanValue)
    const rows = sheetRows.slice(1).map((cells) =>
      headers.reduce<Record<string, unknown>>((record, header, index) => {
        if (header) record[header] = cells[index]
        return record
      }, {}),
    )

    const items = rows
      .map((row) => ({
        client: findValue(row, 'client'),
        initiative: findValue(row, 'initiative'),
        category: findValue(row, 'category') || 'General',
        priority: normalisePriority(findValue(row, 'priority')),
        status: findValue(row, 'status') || 'Not started',
        owner: findValue(row, 'owner') || 'Unassigned',
        startDate: findValue(row, 'startDate'),
        targetDate: findValue(row, 'targetDate'),
        notes: findValue(row, 'notes'),
      }))
      .filter((item) => item.initiative)

    if (!items.length) {
      throw new Error(
        'No roadmap items were found. Include an Initiative, Project, Action, Recommendation, or Task column.',
      )
    }

    return {
      fileName: file.name,
      clientName: items.find((item) => item.client)?.client || 'Client Roadmap',
      sheetName: file.name.toLowerCase().endsWith('.csv') ? 'CSV template' : 'First worksheet',
      items,
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error('The workbook could not be processed.')
  }
}

async function downloadTemplate() {
  const rows = [
    [
      'Client',
      'Initiative',
      'Category',
      'Priority',
      'Status',
      'Owner',
      'Start Date',
      'Target Date',
      'Notes',
    ],
    [
      'Example Client',
      'Complete Microsoft 365 security baseline',
      'Cyber Security',
      'High',
      'Planned',
      'CTO',
      '01/12/2026',
      '31/01/2027',
      'Review identity, device, email, and data protection controls.',
    ],
    [
      'Example Client',
      'Refresh three-year technology roadmap',
      'Strategy',
      'Medium',
      'Not started',
      'Account Manager',
      '01/02/2027',
      '28/02/2027',
      'Align planned investment to business objectives.',
    ],
  ]
  const csv = rows
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','))
    .join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'cto-client-roadmap-template.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

function generatePdf(data: ParsedWorkbook) {
  const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = document.internal.pageSize.getWidth()
  const generated = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  document.setFillColor(12, 24, 43)
  document.rect(0, 0, pageWidth, 45, 'F')
  document.setTextColor(255, 255, 255)
  document.setFont('helvetica', 'bold')
  document.setFontSize(22)
  document.text('CTO Client Management Roadmap', 14, 19)
  document.setFontSize(14)
  document.setFont('helvetica', 'normal')
  document.text(data.clientName, 14, 30)
  document.setFontSize(9)
  document.setTextColor(190, 204, 220)
  document.text(`Generated ${generated} from ${data.fileName}`, 14, 38)

  const counts = priorityOrder.map((priority) => ({
    priority,
    count: data.items.filter((item) => item.priority === priority).length,
  }))
  const populatedCounts = counts.filter(({ count }) => count > 0)

  document.setTextColor(12, 24, 43)
  document.setFont('helvetica', 'bold')
  document.setFontSize(11)
  document.text(`${data.items.length} roadmap initiatives`, 14, 56)
  document.setFont('helvetica', 'normal')
  document.setFontSize(9)
  document.text(
    populatedCounts.map(({ priority, count }) => `${priority}: ${count}`).join('   |   '),
    14,
    63,
  )

  autoTable(document, {
    startY: 70,
    head: [['Initiative', 'Category', 'Priority', 'Status', 'Owner', 'Start', 'Target', 'Notes']],
    body: data.items.map((item) => [
      item.initiative,
      item.category,
      item.priority,
      item.status,
      item.owner,
      item.startDate || '-',
      item.targetDate || '-',
      item.notes || '-',
    ]),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [215, 222, 230],
      lineWidth: 0.15,
      textColor: [32, 45, 61],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [27, 109, 113],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      minCellHeight: 9,
    },
    alternateRowStyles: { fillColor: [244, 247, 249] },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 27 },
      2: { cellWidth: 18 },
      3: { cellWidth: 23 },
      4: { cellWidth: 25 },
      5: { cellWidth: 20 },
      6: { cellWidth: 20 },
      7: { cellWidth: 78 },
    },
    didDrawPage: ({ pageNumber }) => {
      const height = document.internal.pageSize.getHeight()
      document.setFontSize(7)
      document.setTextColor(120, 130, 142)
      document.text('Confidential - CTO Client Management Roadmap', 14, height - 7)
      document.text(`Page ${pageNumber}`, pageWidth - 14, height - 7, { align: 'right' })
    },
  })

  const safeName = data.clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  document.save(`${safeName || 'client'}-cto-roadmap.pdf`)
}

function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const summary = useMemo(() => {
    if (!workbook) return []
    return priorityOrder
      .map((priority) => ({
        priority,
        count: workbook.items.filter((item) => item.priority === priority).length,
      }))
      .filter(({ count }) => count > 0)
  }, [workbook])

  async function handleFile(file?: File) {
    if (!file) return
    setError('')
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      setError('Please choose an Excel .xlsx or .csv file.')
      return
    }
    setIsLoading(true)
    try {
      setWorkbook(await parseWorkbook(file))
    } catch (caught) {
      setWorkbook(null)
      setError(caught instanceof Error ? caught.message : 'The workbook could not be processed.')
    } finally {
      setIsLoading(false)
    }
  }

  function reset() {
    setWorkbook(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand-mark">CTO</div>
        <div>
          <strong>Client Management Roadmap</strong>
          <span>Excel to PDF report builder</span>
        </div>
      </header>

      <section className="hero-section">
        <div className="eyebrow">Private. Browser-based. No data storage.</div>
        <h1>Turn your client roadmap into a polished PDF.</h1>
        <p>
          Upload an Excel workbook, review the detected initiatives, and download a client-ready
          roadmap report. Your file is processed entirely in this browser.
        </p>
      </section>

      <section className="workspace">
        {!workbook ? (
          <div
            className={`upload-card ${isDragging ? 'dragging' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              void handleFile(event.dataTransfer.files[0])
            }}
          >
            <div className="upload-icon">
              <UploadCloud size={34} />
            </div>
            <h2>{isLoading ? 'Reading your workbook...' : 'Upload your roadmap workbook'}</h2>
            <p>Drop an Excel file here or choose one from your computer.</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.csv"
              onChange={(event) => void handleFile(event.target.files?.[0])}
              hidden
            />
            <button className="primary-button" onClick={() => inputRef.current?.click()} disabled={isLoading}>
              <FileSpreadsheet size={18} />
              Choose Excel file
            </button>
            <button className="text-button" onClick={() => void downloadTemplate()}>
              <Download size={16} />
              Download example template
            </button>
            {error && <div className="error-message">{error}</div>}
            <div className="privacy-note">
              <LockKeyhole size={17} />
              Nothing is uploaded or saved. Processing happens locally on your device.
            </div>
          </div>
        ) : (
          <div className="report-card">
            <div className="success-heading">
              <div className="success-icon">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <span>Workbook ready</span>
                <h2>{workbook.clientName}</h2>
                <p>
                  {workbook.fileName} · {workbook.sheetName}
                </p>
              </div>
            </div>

            <div className="metrics">
              <div>
                <strong>{workbook.items.length}</strong>
                <span>Total initiatives</span>
              </div>
              {summary.map(({ priority, count }) => (
                <div key={priority}>
                  <strong>{count}</strong>
                  <span>{priority} priority</span>
                </div>
              ))}
            </div>

            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Initiative</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Target</th>
                  </tr>
                </thead>
                <tbody>
                  {workbook.items.slice(0, 8).map((item, index) => (
                    <tr key={`${item.initiative}-${index}`}>
                      <td>{item.initiative}</td>
                      <td>{item.category}</td>
                      <td>
                        <span className={`priority priority-${item.priority.toLowerCase()}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td>{item.status}</td>
                      <td>{item.owner}</td>
                      <td>{item.targetDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {workbook.items.length > 8 && (
                <div className="more-rows">+ {workbook.items.length - 8} more initiatives in the PDF</div>
              )}
            </div>

            <div className="actions">
              <button className="secondary-button" onClick={reset}>
                <RotateCcw size={17} />
                Use another file
              </button>
              <button className="primary-button" onClick={() => generatePdf(workbook)}>
                <FileText size={18} />
                Download PDF report
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="how-it-works">
        <div>
          <span>01</span>
          <h3>Upload Excel</h3>
          <p>Use your own roadmap workbook or start with the example template.</p>
        </div>
        <div>
          <span>02</span>
          <h3>Review</h3>
          <p>Confirm the initiatives, priorities, owners, and dates detected from the first sheet.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Export PDF</h3>
          <p>Generate a landscape, client-ready roadmap report in one click.</p>
        </div>
      </section>

      <footer>CTO Client Management Roadmap · Files remain on your device</footer>
    </main>
  )
}

export default App
