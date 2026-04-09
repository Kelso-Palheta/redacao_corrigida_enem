import React from 'react';
import { getAllCorrections } from '@/lib/storage';

// Força o Next.js a sempre buscar dados frescos (sem cache)
export const dynamic = 'force-dynamic';
import { 
  LayoutDashboard, 
  ArrowRight,
  TrendingUp,
  Award,
  Users
} from 'lucide-react';
import Link from 'next/link';
import CorrectionTable from './correction-table';

export default async function ProfessorDashboard() {
  const corrections = await getAllCorrections();
  
  // Sort by date (newest first)
  const sortedCorrections = [...corrections].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const stats = {
    total: corrections.length,
    average: corrections.length > 0 
      ? Math.round(corrections.reduce((acc, curr) => acc + curr.totalScore, 0) / corrections.length) 
      : 0,
    topScore: corrections.length > 0 ? Math.max(...corrections.map(c => c.totalScore)) : 0
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 md:py-12 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <LayoutDashboard className="text-violet-400" size={32} />
            Meu Desempenho
          </h2>
          <p className="text-neutral-400 mt-2 font-medium">Acompanhe a evolução da sua turma e o histórico de análises.</p>
        </div>
        <Link href="/professor" className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-2xl text-sm font-bold shadow-lg shadow-violet-600/20 transition-all flex items-center gap-2 text-white">
          Nova Correção <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-3xl border border-white/5 bg-neutral-900/40 space-y-2">
          <div className="flex justify-between items-start">
            <Users size={20} className="text-violet-400" />
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-white">Total Alunos</span>
          </div>
          <div className="text-4xl font-black text-white">{stats.total}</div>
        </div>
        <div className="glass p-6 rounded-3xl border border-white/5 bg-neutral-900/40 space-y-2">
          <div className="flex justify-between items-start">
            <TrendingUp size={20} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-white">Média Geral</span>
          </div>
          <div className="text-4xl font-black text-white">{stats.average} <span className="text-sm text-neutral-500">pts</span></div>
        </div>
        <div className="glass p-6 rounded-3xl border border-white/5 bg-neutral-900/40 space-y-2">
          <div className="flex justify-between items-start">
            <Award size={20} className="text-yellow-500" />
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-white">Maior Nota</span>
          </div>
          <div className="text-4xl font-black text-white">{stats.topScore} <span className="text-sm text-neutral-500">pts</span></div>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] border border-white/5 bg-neutral-900/20 overflow-hidden">
        <CorrectionTable corrections={sortedCorrections} />
      </div>
    </div>
  );
}
