import { NextApiRequest, NextApiResponse } from 'next'
import { createPool, sql } from '@vercel/postgres'
import dotenv from 'dotenv'

dotenv.config()

const pool = createPool({
  connectionString: process.env.POSTGRES_URL || 'postgres://default:H2TrnlAoibV7@ep-royal-block-a2py4b4u-pooler.eu-central-1.aws.neon.tech/verceldb?sslmode=require'
})

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
  importance: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API-Route aufgerufen:', req.method)
  console.log('Umgebungsvariablen:', process.env.POSTGRES_URL)

  if (req.method === 'GET') {
    try {
      const { rows } = await pool.query('SELECT * FROM auftraege')
      res.status(200).json(rows)
    } catch (error) {
      console.error('Error fetching auftraege:', error)
      res.status(500).json({ error: 'Fehler beim Abrufen der Aufträge' })
    }
  } else if (req.method === 'POST') {
    const { nummer, kunde, adresse, mieter, telNr, email, problem, pdfFiles, status, erstelltAm, importance } = req.body
    try {
      const { rows } = await pool.query(
        'INSERT INTO auftraege (nummer, kunde, adresse, mieter, telNr, email, problem, pdfFiles, status, erstelltAm, importance) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
        [nummer, kunde, adresse, mieter, telNr, email, problem, JSON.stringify(pdfFiles), status, erstelltAm, importance]
      )
      res.status(201).json(rows[0])
    } catch (error) {
      console.error('Error creating auftrag:', error)
      res.status(500).json({ error: 'Fehler beim Erstellen des Auftrags' })
    }
  } else if (req.method === 'PUT') {
    const { id, ...updateData } = req.body
    try {
      const setClause = Object.entries(updateData)
        .map(([key, value], index) => `${key} = $${index + 2}`)
        .join(', ')
      
      const values = Object.values(updateData)
      
      const query = `
        UPDATE auftraege
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `
      
      const { rows } = await pool.query(query, [id, ...values])
      
      if (rows.length === 0) {
        res.status(404).json({ error: 'Auftrag nicht gefunden' })
      } else {
        res.status(200).json(rows[0])
      }
    } catch (error) {
      console.error('Error updating auftrag:', error)
      res.status(500).json({ error: 'Fehler beim Aktualisieren des Auftrags' })
    }
  } else if (req.method === 'DELETE') {
    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
    if (!id) {
      res.status(400).json({ error: 'ID ist erforderlich' })
      return
    }
    try {
      const { rowCount } = await pool.query('DELETE FROM auftraege WHERE id = $1', [id])
      if (rowCount === 0) {
        res.status(404).json({ error: 'Auftrag nicht gefunden' })
      } else {
        res.status(204).end()
      }
    } catch (error) {
      console.error('Error deleting auftrag:', error)
      res.status(500).json({ error: 'Fehler beim Löschen des Auftrags' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}