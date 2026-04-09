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
  try {
    const dir = path.dirname(USERS_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.access(USERS_PATH);
  } catch {
    await fs.writeFile(USERS_PATH, JSON.stringify([], null, 2));
  }
}

async function getUsers(): Promise<User[]> {
  await ensureUsersFile();
  const content = await fs.readFile(USERS_PATH, 'utf-8');
  return JSON.parse(content || '[]');
}

async function saveUsers(users: User[]) {
  await ensureUsersFile();
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
}

export async function registerUser(name: string, email: string, password: string): Promise<{ success: boolean; error?: string; user?: Omit<User, 'passwordHash'> }> {
  const users = await getUsers();
  
  // Verifica se e-mail já existe
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'Este e-mail já está cadastrado.' };
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    role: 'professor',
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await saveUsers(users);

  const { passwordHash, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

export async function loginUser(email: string, password: string): Promise<{ success: boolean; error?: string; user?: Omit<User, 'passwordHash'> }> {
  const users = await getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return { success: false, error: 'E-mail não encontrado.' };
  }

  if (user.passwordHash !== hashPassword(password)) {
    return { success: false, error: 'Senha incorreta.' };
  }

  const { passwordHash, ...safeUser } = user;
  return { success: true, user: safeUser };
}
