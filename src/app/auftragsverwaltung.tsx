'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Plus, Edit2, Trash2, Eye, FileText, Printer, Calendar, X } from 'lucide-react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll.area"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { de } from "date-fns/locale"
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { sql } from '@vercel/postgres'
import { put } from '@vercel/blob'


console.log("POSTGRES_URL:", process.env.POSTGRES_URL);

// Stellen Sie sicher, dass dieser Code in einer asynchronen Funktion ausgeführt wird
async function testDatabaseConnection() {
  try {
    const result = await sql`SELECT NOW()`;
    console.log("Datenbankverbindung erfolgreich:", result);
  } catch (error) {
    console.error("Fehler bei der Datenbankverbindung:", error);
  }
}

testDatabaseConnection();

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { de },
})

type Importance = 'Hoch' | 'Normal' | 'Niedrig'

type Comment = {
  id: number
  author: string
  text: string
  createdAt: Date
}

type Auftrag = {
  id: number
  nummer: string
  kunde: string
  adresse: string
  mieter: string
  telNr: string
  email: string
  problem: string
  pdfFiles: string[]
  status: string
  erstelltAm: Date
  importance: Importance
  comments: Comment[]
  termin?: Date
}

type KachelProps = {
  title: string
  auftraege: Auftrag[]
  onEdit: (auftrag: Auftrag) => void
  onDelete: (id: number) => void
  onDrop: (item: Auftrag, targetStatus: string) => void
  onView: (auftrag: Auftrag) => void
}

const formatDate = (date: Date) => {
  return format(date, 'dd.MM.yyyy HH:mm', { locale: de })
}

const formatTime = (date: Date) => {
  return format(date, 'HH:mm', { locale: de })
}

const getImportanceColor = (importance: Importance) => {
  switch (importance) {
    case 'Hoch':
      return 'bg-red-100 text-red-800'
    case 'Normal':
      return 'bg-white text-gray-800'
    case 'Niedrig':
      return 'bg-green-100 text-green-800'
  }
}

const getKachelColor = (title: string) => {
  switch (title) {
    case 'Erledigt':
      return 'bg-green-500 text-white'
    case 'Rechnung':
      return 'bg-blue-200 text-blue-800'
    case 'Termin':
      return 'bg-yellow-200 text-yellow-800'
    case 'In Bearbeitung':
      return 'bg-green-200 text-green-800'
    case 'Nochmal vorbeigehen':
      return 'bg-red-200 text-red-800'
    default:
      return 'bg-white'
  }
}

const DraggableAuftrag: React.FC<{ 
  auftrag: Auftrag; 
  onEdit: (auftrag: Auftrag) => void; 
  onDelete: (id: number) => void;
  onView: (auftrag: Auftrag) => void;
}> = ({ auftrag, onEdit, onDelete, onView }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'auftrag',
    item: auftrag,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  const importanceColor = getImportanceColor(auftrag.importance)

  return (
    <div ref={drag} className={`mb-2 p-2 rounded ${isDragging ? 'opacity-50' : ''} ${importanceColor}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold">{auftrag.nummer}</span>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={() => onView(auftrag)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onEdit(auftrag)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onDelete(auftrag.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="font-semibold">{auftrag.kunde}</p>
      <p className="text-sm">{auftrag.adresse}</p>
      <p className="text-sm whitespace-pre-wrap">{auftrag.problem}</p>
    </div>
  )
}

const Kachel: React.FC<KachelProps> = ({ title, auftraege, onEdit, onDelete, onDrop, onView }) => {
  const [, drop] = useDrop(() => ({
    accept: 'auftrag',
    drop: (item: Auftrag) => onDrop(item, title),
  }))

  const kachelColor = getKachelColor(title)

  return (
    <Card className={`w-full h-[calc(100vh-10rem)] flex flex-col ${kachelColor}`} ref={drop}>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium leading-none">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {auftraege.map((auftrag) => (
          <DraggableAuftrag 
            key={auftrag.id} 
            auftrag={auftrag} 
            onEdit={onEdit} 
            onDelete={onDelete} 
            onView={onView}
          />
        ))}
      </CardContent>
    </Card>
  )
}

const PrintableAuftrag: React.FC<{ auftrag: Auftrag }> = ({ auftrag }) => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auftrag Details</h1>
      <div className="grid gap-4">
        <p><strong>Nummer:</strong> {auftrag.nummer}</p>
        <p><strong>Kunde:</strong> {auftrag.kunde}</p>
        <p><strong>Adresse:</strong> {auftrag.adresse}</p>
        <p><strong>Mieter:</strong> {auftrag.mieter}</p>
        <p><strong>Tel. Nr.:</strong> {auftrag.telNr}</p>
        <p><strong>E-Mail:</strong> {auftrag.email}</p>
        <p><strong>Problem:</strong> <pre className="whitespace-pre-wrap">{auftrag.problem}</pre></p>
        <p><strong>Status:</strong> {auftrag.status}</p>
        <p><strong>Wichtigkeit:</strong> {auftrag.importance}</p>
        <p><strong>Erstellt am:</strong> {formatDate(auftrag.erstelltAm)}</p>
        {auftrag.termin && <p><strong>Termin:</strong> {formatDate(auftrag.termin)}</p>}
        {auftrag.pdfFiles && auftrag.pdfFiles.length > 0 && (
          <div>
            <strong>Dateien:</strong>
            <ul>
              {auftrag.pdfFiles.map((file, index) => (
                <li key={index}>{file}</li>
              ))}
            </ul>
          </div>
        )}
        {auftrag.comments.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mt-4 mb-2">Kommentare</h2>
            {auftrag.comments.map((comment, index) => (
              <div key={index} className="mb-2">
                <p><strong>{comment.author}</strong> - {formatDate(comment.createdAt)}</p>
                <p>{comment.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const CommentSection: React.FC<{ 
  auftrag: Auftrag; 
  onAddComment: (auftragId: number, comment: Omit<Comment, 'id' | 'createdAt'>) => void;
  onSetTermin: (auftragId: number, termin: Date | undefined) => void;
}> = ({ auftrag, onAddComment, onSetTermin }) => {
  const [newComment, setNewComment] = useState({ author: '', text: '' })
  const [newTermin, setNewTermin] = useState<string>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.author.trim() && newComment.text.trim()) {
      onAddComment(auftrag.id, newComment)
      setNewComment({ author: '', text: '' })
    }
    if (newTermin) {
      onSetTermin(auftrag.id, new Date(newTermin))
      setNewTermin('')
    }
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Kommentare und Termin</h3>
      {auftrag.termin && (
        <div className="mb-4 p-2 bg-yellow-100 rounded">
          <strong>Aktueller Termin:</strong> {formatDate(auftrag.termin)}
        </div>
      )}
      {auftrag.comments.map((comment, index) => (
        <div key={index} className="mb-2 p-2 bg-gray-100 rounded">
          <p className="font-semibold">{comment.author} - {formatDate(comment.createdAt)}</p>
          <p>{comment.text}</p>
        </div>
      ))}
      <form onSubmit={handleSubmit} className="mt-4 space-y-2">
        <Input
          placeholder="Ihr Name"
          value={newComment.author}
          onChange={(e) => setNewComment({ ...newComment, author: e.target.value })}
        />
        <Textarea
          placeholder="Ihr Kommentar"
          value={newComment.text}
          onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
        />
        <Input
          type="datetime-local"
          value={newTermin}
          onChange={(e) => setNewTermin(e.target.value)}
        />
        <Button type="submit">Kommentar/Termin hinzufügen</Button>
      </form>
    </div>
  )
}

const Auftragsverwaltung: React.FC = () => {
  const [auftraege, setAuftraege] = useState<Auftrag[]>([])
  const [kacheln] = useState(['Offen', 'In Bearbeitung', 'Termin', 'Nochmal vorbeigehen', 'Erledigt', 'Rechnung'])
  const [neuerAuftrag, setNeuerAuftrag] = useState<Omit<Auftrag, 'id' | 'status' | 'nummer' | 'erstelltAm' | 'comments'>>({
    kunde: '', adresse: '', mieter: '', telNr: '', email: '', problem: '', pdfFiles: [], importance: 'Normal'
  })
  const [bearbeiteterAuftrag, setBearbeiteterAuftrag] = useState<Auftrag | null>(null)
  const [angesehenerAuftrag, setAngesehenerAuftrag] = useState<Auftrag | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false)
  const [nextAuftragNummer, setNextAuftragNummer] = useState(1)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<View>('month')
  const printRef = useRef<HTMLDivElement>(null)

  const testDatabaseConnection = async () => {
    try {
      const result = await sql`SELECT NOW()`;
      console.log("Datenbankverbindung erfolgreich:", result);
    } catch (error) {
      console.error("Fehler bei der Datenbankverbindung:", error);
    }
  };

  const checkTableStructure = async () => {
    try {
      const result = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'auftraege'
      `;
      console.log("Tabellenstruktur:", result);
    } catch (error) {
      console.error("Fehler beim Überprüfen der Tabellenstruktur:", error);
    }
  };

  useEffect(() => {
    const fetchAuftraege = async () => {
      try {
        const { rows } = await sql`SELECT * FROM auftraege`
        const auftraegeWithDates = rows.map(auftrag => ({
          ...auftrag,
          erstelltAm: new Date(auftrag.erstelltAm),
          termin: auftrag.termin ? new Date(auftrag.termin) : undefined
        }))
        setAuftraege(auftraegeWithDates as Auftrag[])
      } catch (error) {
        console.error('Fehler beim Abrufen der Aufträge:', error)
      }
    }
    fetchAuftraege()
    testDatabaseConnection()
    checkTableStructure()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (bearbeiteterAuftrag) {
      setBearbeiteterAuftrag({ ...bearbeiteterAuftrag, [name]: value })
    } else {
      setNeuerAuftrag({ ...neuerAuftrag, [name]: value })
    }
  }

  const handleImportanceChange = (value: Importance) => {
    if (bearbeiteterAuftrag) {
      setBearbeiteterAuftrag({ ...bearbeiteterAuftrag, importance: value })
    } else {
      setNeuerAuftrag({ ...neuerAuftrag, importance: value })
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const uploadedFiles = await Promise.all(files.map(async (file) => {
        try {
          const { url } = await put(`auftraege/${file.name}`, file, { access: 'public' })
          return url
        } catch (error) {
          console.error('Fehler beim Hochladen der Datei:', error)
          return null
        }
      }))
      const validFiles = uploadedFiles.filter((url): url is string => url !== null)
      if (bearbeiteterAuftrag) {
        setBearbeiteterAuftrag({ ...bearbeiteterAuftrag, pdfFiles: [...bearbeiteterAuftrag.pdfFiles, ...validFiles] })
      } else {
        setNeuerAuftrag({ ...neuerAuftrag, pdfFiles: validFiles })
      }
    }
  }

  const handleSubmit = useCallback(async () => {
    console.log("handleSubmit wurde aufgerufen");
    console.log("Umgebungsvariablen:", process.env);
    try {
      if (bearbeiteterAuftrag) {
        console.log("Bearbeite existierenden Auftrag:", bearbeiteterAuftrag);
        await sql`
          UPDATE auftraege
          SET kunde = ${bearbeiteterAuftrag.kunde},
              adresse = ${bearbeiteterAuftrag.adresse},
              mieter = ${bearbeiteterAuftrag.mieter},
              telNr = ${bearbeiteterAuftrag.telNr},
              email = ${bearbeiteterAuftrag.email},
              problem = ${bearbeiteterAuftrag.problem},
              pdfFiles = ${JSON.stringify(bearbeiteterAuftrag.pdfFiles)},
              status = ${bearbeiteterAuftrag.status},
              importance = ${bearbeiteterAuftrag.importance},
              termin = ${bearbeiteterAuftrag.termin ? bearbeiteterAuftrag.termin.toISOString() : null}
          WHERE id = ${bearbeiteterAuftrag.id}
        `
        setAuftraege(prevAuftraege => 
          prevAuftraege.map(a => a.id === bearbeiteterAuftrag.id ? bearbeiteterAuftrag : a)
        )
      } else {
        console.log("Füge neuen Auftrag hinzu:", neuerAuftrag);
        const { rows } = await sql`
          INSERT INTO auftraege (
            nummer, kunde, adresse, mieter, telNr, email, problem, pdfFiles, status, erstelltAm, importance
          ) VALUES (
            ${nextAuftragNummer.toString().padStart(4, '0')},
            ${neuerAuftrag.kunde},
            ${neuerAuftrag.adresse},
            ${neuerAuftrag.mieter},
            ${neuerAuftrag.telNr},
            ${neuerAuftrag.email},
            ${neuerAuftrag.problem},
            ${JSON.stringify(neuerAuftrag.pdfFiles)},
            'Offen',
            ${new Date().toISOString()},
            ${neuerAuftrag.importance}
          )
          RETURNING *
        `
        console.log("SQL-Abfrage erfolgreich ausgeführt, Ergebnis:", rows);
        const newAuftrag = {
          ...rows[0],
          erstelltAm: new Date(rows[0].erstelltAm),
          termin: rows[0].termin ? new Date(rows[0].termin) : undefined
        } as Auftrag
        setAuftraege(prevAuftraege => [...prevAuftraege, newAuftrag])
        setNextAuftragNummer(prev => prev + 1)
      }
      setIsDialogOpen(false)
      setNeuerAuftrag({ kunde: '', adresse: '', mieter: '', telNr: '', email: '', problem: '', pdfFiles: [], importance: 'Normal' })
      setBearbeiteterAuftrag(null)
    } catch (error) {
      console.error('Detaillierter Fehler beim Speichern des Auftrags:', error);
      if (error instanceof Error) {
        console.error('Fehlermeldung:', error.message);
        console.error('Stacktrace:', error.stack);
      }
    }
  }, [bearbeiteterAuftrag, neuerAuftrag, nextAuftragNummer])

  const handleEdit = useCallback((auftrag: Auftrag) => {
    setBearbeiteterAuftrag(auftrag)
    setIsDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (id: number) => {
    try {
      await sql`DELETE FROM auftraege WHERE id = ${id}`
      setAuftraege(prevAuftraege => prevAuftraege.filter(a => a.id !== id))
    } catch (error) {
      console.error('Fehler beim Löschen des Auftrags:', error)
    }
  }, [])

  const handleDrop = useCallback(async (item: Auftrag, targetStatus: string) => {
    try {
      await sql`UPDATE auftraege SET status = ${targetStatus} WHERE id = ${item.id}`
      setAuftraege(prevAuftraege => 
        prevAuftraege.map(a => 
          a.id === item.id ? { ...a, status: targetStatus } : a
        )
      )
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Auftragsstatus:', error)
    }
  }, [])

  const handleView = useCallback((auftrag: Auftrag) => {
    setAngesehenerAuftrag(auftrag)
    setIsViewDialogOpen(true)
  }, [])

  const handleAddComment = useCallback(async (auftragId: number, comment: Omit<Comment, 'id' | 'createdAt'>) => {
    try {
      const { rows } = await sql`
        INSERT INTO comments (auftrag_id, author, text, created_at)
        VALUES (${auftragId}, ${comment.author}, ${comment.text}, ${new Date().toISOString()})
        RETURNING *
      `
      const newComment = {
        ...rows[0],
        createdAt: new Date(rows[0].created_at)
      } as Comment
      setAuftraege(prevAuftraege => 
        prevAuftraege.map(auftrag => 
          auftrag.id === auftragId
            ? {
                ...auftrag,
                comments: [
                  ...auftrag.comments,
                  newComment
                ]
              }
            : auftrag
        )
      )
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Kommentars:', error)
    }
  }, [])

  const handleSetTermin = useCallback(async (auftragId: number, termin: Date | undefined) => {
    try {
      const terminString = termin ? termin.toISOString() : null;
      await sql`UPDATE auftraege SET termin = ${terminString} WHERE id = ${auftragId}`
      setAuftraege(prevAuftraege => 
        prevAuftraege.map(auftrag => 
          auftrag.id === auftragId
            ? { ...auftrag, termin }
            : auftrag
        )
      )
      if (angesehenerAuftrag && angesehenerAuftrag.id === auftragId) {
        setAngesehenerAuftrag({ ...angesehenerAuftrag, termin })
      }
    } catch (error) {
      console.error('Fehler beim Setzen des Termins:', error)
    }
  }, [angesehenerAuftrag])

  const handlePrint = useCallback(() => {
    const printContent = printRef.current
    if (printContent) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write('<html><head><title>Auftrag Drucken</title>')
        printWindow.document.write('<style>')
        printWindow.document.write(`
          body { font-family: Arial, sans-serif; }
          .print-content { max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          p { margin-bottom: 10px; }
          strong { font-weight: bold; }
          pre { white-space: pre-wrap; font-family: inherit; }
        `)
        printWindow.document.write('</style>')
        printWindow.document.write('</head><body>')
        printWindow.document.write('<div class="print-content">')
        printWindow.document.write(printContent.innerHTML)
        printWindow.document.write('</div></body></html>')
        printWindow.document.close()
        printWindow.print()
      }
    }
  }, [])

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate)
  }, [])

  const handleViewChange = useCallback((newView: View) => {
    setCurrentView(newView)
  }, [])

  const calendarEvents = auftraege
    .filter(auftrag => auftrag.termin)
    .map(auftrag => ({
      id: auftrag.id,
      title: `Auftrag${auftrag.nummer}: ${formatTime(auftrag.termin!)}`,
      start: new Date(auftrag.termin!),
      end: new Date(auftrag.termin!),
      resource: auftrag
    }))

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-4 max-w-full overflow-x-hidden">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div className="flex items-center mb-2 sm:mb-0">
            <Image
              src="/placeholder.svg"
              alt="Dimbau Logo"
              width={50}
              height={50}
              className="mr-2"
            />
            <h1 className="text-2xl font-bold">Auftragsverwaltung</h1>
          </div>
          <div className="flex space-x-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Neuer Auftrag</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{bearbeiteterAuftrag ? 'Auftrag bearbeiten' : 'Neuer Auftrag'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Input name="kunde" placeholder="Kunde" value={bearbeiteterAuftrag?.kunde || neuerAuftrag.kunde} onChange={handleInputChange} />
                  <Input name="adresse" placeholder="Adresse" value={bearbeiteterAuftrag?.adresse || neuerAuftrag.adresse} onChange={handleInputChange} />
                  <Input name="mieter" placeholder="Mieter" value={bearbeiteterAuftrag?.mieter || neuerAuftrag.mieter} onChange={handleInputChange} />
                  <Input name="telNr" placeholder="Tel. Nr." value={bearbeiteterAuftrag?.telNr || neuerAuftrag.telNr} onChange={handleInputChange} />
                  <Input name="email" placeholder="E-Mail" value={bearbeiteterAuftrag?.email || neuerAuftrag.email} onChange={handleInputChange} />
                  <Textarea 
                    name="problem" 
                    placeholder="Problem" 
                    value={bearbeiteterAuftrag?.problem || neuerAuftrag.problem} 
                    onChange={handleInputChange}
                    rows={5}
                  />
                  <Input name="pdfFiles" type="file" accept=".pdf" onChange={handleFileChange} multiple />
                  {(bearbeiteterAuftrag?.pdfFiles || []).map((file, index) => (
                    <div key={index} className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="text-sm">{file}</span>
                    </div>
                  ))}
                  <Select onValueChange={handleImportanceChange} defaultValue={bearbeiteterAuftrag?.importance || neuerAuftrag.importance}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wichtigkeit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hoch">Hoch</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Niedrig">Niedrig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit}>{bearbeiteterAuftrag ? 'Aktualisieren' : 'Hinzufügen'}</Button>
              </DialogContent>
            </Dialog>
            <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
              <DialogTrigger asChild>
                <Button><Calendar className="mr-2 h-4 w-4" /> Kalender</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] h-[80vh] max-h-[80vh] flex flex-col p-0">
                <DialogHeader className="px-4 py-2">
                  <DialogTitle>Auftragskalender</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-grow">
                  <div className="p-4" style={{ height: 'calc(80vh - 60px)' }}>
                    <BigCalendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      style={{ height: '100%' }}
                      views={['month', 'week', 'day'] as View[]}
                      view={currentView}
                      onView={handleViewChange}
                      date={currentDate}
                      onNavigate={handleNavigate}
                      messages={{
                        next: "Nächster",
                        previous: "Vorheriger",
                        today: "Heute",
                        month: "Monat",
                        week: "Woche",
                        day: "Tag",
                      }}
                      onSelectEvent={(event: { resource: Auftrag }) => {
                        setAngesehenerAuftrag(event.resource)
                        setIsViewDialogOpen(true)
                        setIsCalendarDialogOpen(false)
                      }}
                      eventPropGetter={(event) => ({
                        style: {
                          backgroundColor: getImportanceColor(event.resource.importance),
                          color: 'black',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8em',
                          whiteSpace: 'normal',
                          height: '100%',
                        },
                      })}
                      components={{
                        event: (props) => (
                          <div className="p-1 text-center overflow-hidden text-ellipsis">
                            <div className="font-bold">{props.title}</div>
                            <div className="text-xs">{props.event.resource.kunde}</div>
                          </div>
                        ),
                        toolbar: (props) => (
                          <div className="rbc-toolbar">
                            <span className="rbc-btn-group">
                              <Button onClick={() => props.onNavigate('PREV')}>Zurück</Button>
                              <Button onClick={() => props.onNavigate('TODAY')}>Heute</Button>
                              <Button onClick={() => props.onNavigate('NEXT')}>Vor</Button>
                            </span>
                            <span className="rbc-toolbar-label">{props.label}</span>
                            <span className="rbc-btn-group">
                              {(['month', 'week', 'day'] as View[]).map(view => (
                                <Button
                                  key={view}
                                  onClick={() => props.onView(view)}
                                  className={props.view === view ? 'rbc-active' : ''}
                                >
                                  {view === 'month' ? 'Monat' : view === 'week' ? 'Woche' : 'Tag'}
                                </Button>
                              ))}
                            </span>
                          </div>
                        ),
                      }}
                    />
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kacheln.map(kachel => (
            <Kachel 
              key={kachel} 
              title={kachel} 
              auftraege={auftraege.filter(a => a.status === kachel)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDrop={handleDrop}
              onView={handleView}
            />
          ))}
        </div>
      </div>
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[425px] h-[80vh] max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-4 py-2 flex justify-between items-center">
            <DialogTitle>Auftrag Details</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsViewDialogOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <ScrollArea className="flex-grow">
            <div className="px-4 py-4 space-y-4">
              <p><strong>Nummer:</strong> {angesehenerAuftrag?.nummer}</p>
              <p><strong>Kunde:</strong> {angesehenerAuftrag?.kunde}</p>
              <p><strong>Adresse:</strong> {angesehenerAuftrag?.adresse}</p>
              <p><strong>Mieter:</strong> {angesehenerAuftrag?.mieter}</p>
              <p><strong>Tel. Nr.:</strong> {angesehenerAuftrag?.telNr}</p>
              <p><strong>E-Mail:</strong>
                <a href={`mailto:${angesehenerAuftrag?.email}`} className="ml-2 text-blue-500 hover:underline">
                  {angesehenerAuftrag?.email}
                </a>
              </p>
              <div>
                <strong>Problem:</strong>
                <pre className="mt-2 whitespace-pre-wrap">{angesehenerAuftrag?.problem}</pre>
              </div>
              <p><strong>Status:</strong> {angesehenerAuftrag?.status}</p>
              <p><strong>Wichtigkeit:</strong> 
                <span className={`ml-2 px-2 py-1 rounded ${getImportanceColor(angesehenerAuftrag?.importance as Importance)}`}>
                  {angesehenerAuftrag?.importance}
                </span>
              </p>
              <p><strong>Erstellt am:</strong> {angesehenerAuftrag?.erstelltAm && formatDate(angesehenerAuftrag.erstelltAm)}</p>
              {angesehenerAuftrag?.pdfFiles && angesehenerAuftrag.pdfFiles.length > 0 && (
                <div>
                  <strong>Dateien:</strong>
                  {angesehenerAuftrag.pdfFiles.map((file, index) => (
                    <div key={index} className="ml-2 mt-1">
                      <a href={file} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {file.split('/').pop()}
                      </a>
                    </div>
                  ))}
                </div>
              )}
              {angesehenerAuftrag && (
                <CommentSection 
                  auftrag={angesehenerAuftrag} 
                  onAddComment={handleAddComment}
                  onSetTermin={handleSetTermin}
                />
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="px-4 py-2">
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Drucken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          {angesehenerAuftrag && <PrintableAuftrag auftrag={angesehenerAuftrag} />}
        </div>
      </div>
    </DndProvider>
  )
}

export default Auftragsverwaltung