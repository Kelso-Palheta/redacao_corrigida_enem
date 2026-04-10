import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const USERS_PATH = path.join(process.cwd(), 'src/lib/data/users.json');

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'professor';
  createdAt: string;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function ensureUsersFile() {
  if (process.env.SUPABASE_URL) return; // Pula se usar Supabase
  try {
    const dir = path.dirname(USERS_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.access(USERS_PATH);
  } catch {
    await fs.writeFile(USERS_PATH, JSON.stringify([], null, 2));
  }
}

export async function registerUser(name: string, email: string, password: string): Promise<{ success: boolean; error?: string; user?: Omit<User, 'passwordHash'> }> {
  const userEmail = email.toLowerCase();
  
  const newUser: User = {
    id: crypto.randomUUID(),
    name,
    email: userEmail,
    passwordHash: hashPassword(password),
    role: 'professor',
    createdAt: new Date().toISOString(),
  };

  // 1. Prioridade: Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      // Verifica se existe
      const checkRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?email=eq.${userEmail}&select=id`, {
        headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` },
        cache: 'no-store'
      });
      
      const existing = await checkRes.json();
      if (existing && existing.length > 0) {
        return { success: false, error: 'Este e-mail já está cadastrado.' };
      }

      // Insere
      const insertRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(newUser)
      });
      
      if (!insertRes.ok) throw new Error('Erro ao inserir no Supabase');
      
      const { passwordHash, ...safeUser } = newUser;
      return { success: true, user: safeUser };
    } catch (e) {
      console.error('Erro no Supabase Auth Register:', e);
    }
  }

  // 2. Fallback: Local JSON
  await ensureUsersFile();
  const content = await fs.readFile(USERS_PATH, 'utf-8');
  const users: User[] = JSON.parse(content || '[]');
  
  if (users.find(u => u.email === userEmail)) {
    return { success: false, error: 'Este e-mail já está cadastrado.' };
  }

  users.push(newUser);
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));

  const { passwordHash, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

export async function loginUser(email: string, password: string): Promise<{ success: boolean; error?: string; user?: Omit<User, 'passwordHash'> }> {
  const userEmail = email.toLowerCase();
  const inputHash = hashPassword(password);

  // 1. Prioridade: Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?email=eq.${userEmail}&select=*`, {
        headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` },
        cache: 'no-store'
      });
      
      const data = await res.json();
      if (!data || data.length === 0) {
        return { success: false, error: 'E-mail não encontrado.' };
      }
      
      const user = data[0];
      if (user.passwordHash !== inputHash) {
        return { success: false, error: 'Senha incorreta.' };
      }
      
      const { passwordHash: _, ...safeUser } = user;
      return { success: true, user: safeUser };
    } catch (e) {
      console.error('Erro no Supabase Auth Login:', e);
    }
  }

  // 2. Fallback: Local JSON
  await ensureUsersFile();
  const content = await fs.readFile(USERS_PATH, 'utf-8');
  const users: User[] = JSON.parse(content || '[]');
  
  const user = users.find(u => u.email === userEmail);
  if (!user) {
    return { success: false, error: 'E-mail não encontrado.' };
  }

  if (user.passwordHash !== inputHash) {
    return { success: false, error: 'Senha incorreta.' };
  }

  const { passwordHash: _, ...safeUser } = user;
  return { success: true, user: safeUser };
}
