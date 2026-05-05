import React, { useState, useEffect } from 'react';
import { Rubric, Group, Evaluation } from './types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, Users, FileText, TrendingUp } from 'lucide-react';
import { cn } from './lib/utils';

interface DashboardProps {
  rubric: Rubric;
  group: Group;
  onClose: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ rubric, group, onClose }) => {
  const { profile } = useAuth();
  const ownerId = profile?.impersonatedBy || profile?.uid;

  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    const q = query(
      collection(db, 'evaluations'),
      where('ownerId', '==', ownerId),
      where('rubricId', '==', rubric.id),
      where('groupId', '==', group.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const evals: Record<string, Evaluation> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Evaluation;
        evals[data.studentId] = { ...data, id: doc.id };
      });
      setEvaluations(evals);
      setLoading(false);
    });

    return unsubscribe;
  }, [ownerId, rubric.id, group.id]);

  const maxScore = rubric.maxScore || 10;
  const data = group.students.map(student => ({
    name: student.name,
    score: evaluations[student.id]?.score || 0,
    status: evaluations[student.id] ? 'Completado' : 'Pendiente'
  })).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  const averageScore = data.reduce((acc, curr) => acc + curr.score, 0) / data.length;
  const completedCount = data.filter(d => d.status === 'Completado').length;

  const exportCSV = () => {
    const headers = ['Estudiante', 'Calificación', 'Estado'];
    const rows = data.map(d => [d.name, d.score.toFixed(2), d.status]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Resumen_${group.name}_${rubric.title}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (loading) return <div className="flex justify-center p-20">Cargando dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard de Calificaciones</h2>
          <p className="text-gray-500 font-medium">{rubric.title} • {group.name}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-bold shadow-sm">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-bold shadow-lg shadow-indigo-200">
            Cerrar Dashboard
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Media del Grupo</div>
            <div className="text-3xl font-black text-gray-900">{averageScore.toFixed(2)} <span className="text-sm text-gray-400 font-normal">/ {maxScore}</span></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Estudiantes</div>
            <div className="text-3xl font-black text-gray-900">{group.students.length}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Evaluaciones</div>
            <div className="text-3xl font-black text-gray-900">{completedCount} <span className="text-sm text-gray-400 font-normal">completadas</span></div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-xl">
        <h3 className="text-xl font-bold mb-8 text-gray-900">Distribución de Calificaciones</h3>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                interval={0} 
                height={80} 
                tick={{ fontSize: 12, fontWeight: 500, fill: '#666' }}
              />
              <YAxis domain={[0, maxScore]} tick={{ fontSize: 12, fontWeight: 500, fill: '#666' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.score >= (maxScore / 2) ? '#10b981' : '#f43f5e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-6 font-bold text-gray-400 uppercase text-xs tracking-widest">Estudiante</th>
              <th className="p-6 font-bold text-gray-400 uppercase text-xs tracking-widest">Calificación</th>
              <th className="p-6 font-bold text-gray-400 uppercase text-xs tracking-widest">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((student, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-6 font-bold text-gray-900">{student.name}</td>
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-1000",
                          student.score >= (maxScore / 2) ? "bg-emerald-500" : "bg-rose-500"
                        )}
                        style={{ width: `${(student.score / maxScore) * 100}%` }}
                      />
                    </div>
                    <span className={cn(
                      "font-black",
                      student.score >= (maxScore / 2) ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {student.score.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="p-6">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                    student.status === 'Completado' 
                      ? "bg-emerald-50 text-emerald-600" 
                      : "bg-amber-50 text-amber-600"
                  )}>
                    {student.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
