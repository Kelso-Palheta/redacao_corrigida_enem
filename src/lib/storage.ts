// Este arquivo gerencia a persistência dos dados.
// No ambiente local, salva em JSON. No ambiente de produção (Vercel), deve usar Supabase.

import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src/lib/data/corrections.json');

export interface Correction {
  id: string;
  studentName: string;
  studentClass: string;
  essayTheme: string;
  result: string;
  scoreData: any[];
  totalScore: number;
  createdAt: string;
}

// Inicializa o arquivo se não existir (Apenas Local)
async function ensureFile() {
  if (process.env.SUPABASE_URL) return; // Pula se usar Supabase
  try {
    const dir = path.dirname(DATA_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.access(DATA_PATH);
  } catch {
    await fs.writeFile(DATA_PATH, JSON.stringify([], null, 2));
  }
}

export async function saveCorrection(data: Omit<Correction, 'id' | 'createdAt'>): Promise<string> {
  const id = Math.random().toString(36).substring(2, 5).toUpperCase() + '-' + Math.random().toString(36).substring(2, 5).toUpperCase();
  const newCorrection: Correction = { ...data, id, createdAt: new Date().toISOString() };

  // Prioridade 1: Supabase (Nuvem/Produção) usando REST API nativa
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/corrections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(newCorrection)
      });
      if (res.ok) return id;
      throw new Error(`Supabase API Erro: ${res.status}`);
    } catch (error) {
      console.error("Erro ao salvar no Supabase, tentando local...", error);
    }
  }

  // Prioridade 2: Local JSON
  await ensureFile();
  const fileContent = await fs.readFile(DATA_PATH, 'utf-8');
  const currentData = JSON.parse(fileContent || '[]');
  currentData.push(newCorrection);
  await fs.writeFile(DATA_PATH, JSON.stringify(currentData, null, 2));
  
  return id;
}

export async function getCorrectionById(id: string): Promise<Correction | null> {
  const searchId = id.trim().toUpperCase();

  // Prioridade 1: Supabase via REST API
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/corrections?id=eq.${searchId}&select=*`, {
        method: 'GET',
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        // Adiciona cache control no build para garantir fetches dinâmicos
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) return data[0];
      }
    } catch (e) {}
  }

  // Prioridade 2: Local JSON
  try {
    await ensureFile();
    const fileContent = await fs.readFile(DATA_PATH, 'utf-8');
    const currentData: Correction[] = JSON.parse(fileContent || '[]');
    return currentData.find(c => c.id.toUpperCase() === searchId) || null;
  } catch {
    return null;
  }
}

export async function getAllCorrections(): Promise<Correction[]> {
  // Prioridade 1: Supabase via REST API
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/corrections?select=*&order=createdAt.desc`, {
        method: 'GET',
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {}
  }

  // Prioridade 2: Local JSON
  try {
    await ensureFile();
    const fileContent = await fs.readFile(DATA_PATH, 'utf-8');
    return JSON.parse(fileContent || '[]');
  } catch {
    return [];
  }
}
