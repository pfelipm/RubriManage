import React, { useState, useEffect } from 'react';
import { Rubric, Group, Evaluation, Student } from './types';
import { calculateScore } from './utils';
import { ChevronLeft, ChevronRight, Save, CheckCircle2, LayoutDashboard, User } from 'lucide-react';
import { collection, query, where, getDocs, setDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { cn } from './lib/utils';

interface EvaluatorProps {
  rubric: Rubric;
  group: Group;
  onClose: () => void;
}

export const Evaluator: React.FC<EvaluatorProps> = ({ rubric, group, onClose }) => {
  const { profile } = useAuth();
  const ownerId = profile?.impersonatedBy || profile?.uid;

  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [loading, setLoading] = useState(true);

  const sortedStudents = [...group.students].sort((a, b) => a.name.localeCompare(b.name));
  const currentStudent = sortedStudents[currentStudentIndex];

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

  const currentEvaluation = evaluations[currentStudent?.id] || {
    ownerId,
    rubricId: rubric.id,
    groupId: group.id,
    studentId: currentStudent?.id,
    selections: {},
    score: 0
  };

  // Recalculate score on the fly for display to ensure it's always accurate
  const displayScore = calculateScore(rubric.indicators, currentEvaluation.selections, rubric.maxScore);

  const handleSelect = async (indicator: any, level: any, indicatorIndex: number, levelIndex: number) => {
    if (!ownerId || !currentStudent) return;

    const key = indicator.id || indicatorIndex.toString();
    const value = level.id || levelIndex.toString();

    const newSelections = { ...currentEvaluation.selections, [key]: value };
    const newScore = calculateScore(rubric.indicators, newSelections, rubric.maxScore);

    const evaluationId = `${rubric.id}_${group.id}_${currentStudent.id}`;
    await setDoc(doc(db, 'evaluations', evaluationId), {
      ...currentEvaluation,
      selections: newSelections,
      score: newScore,
      updatedAt: new Date()
    });
  };

  const nextStudent = () => {
    if (currentStudentIndex < sortedStudents.length - 1) {
      setCurrentStudentIndex(currentStudentIndex + 1);
    }
  };

  const prevStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(currentStudentIndex - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if user is interacting with a select or other input
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowRight') {
        nextStudent();
      } else if (e.key === 'ArrowLeft') {
        prevStudent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStudentIndex, sortedStudents.length]);

  if (loading) return <div className="flex justify-center p-20 dark:text-gray-400">Cargando evaluaciones...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header / Navigation */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 transition-colors">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-900 dark:text-white">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{rubric.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Grupo: {group.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-2 rounded-xl border dark:border-white/5 transition-colors">
          <button onClick={prevStudent} disabled={currentStudentIndex === 0} className="p-1.5 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 rounded-lg shadow-sm transition-all text-gray-900 dark:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 min-w-48 justify-center">
            <User className="w-4 h-4 text-indigo-500" />
            <select 
              className="bg-transparent font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
              value={currentStudentIndex}
              onChange={(e) => setCurrentStudentIndex(parseInt(e.target.value))}
            >
              {sortedStudents.map((s, i) => (
                <option key={s.id} value={i} className="dark:bg-gray-900">
                  {s.name} {evaluations[s.id] ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <button onClick={nextStudent} disabled={currentStudentIndex === sortedStudents.length - 1} className="p-1.5 hover:bg-white dark:hover:bg-gray-700 disabled:opacity-30 rounded-lg shadow-sm transition-all text-gray-900 dark:text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Calificación</div>
            <div className={cn(
              "text-3xl font-black",
              displayScore >= (rubric.maxScore / 2) ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {displayScore.toFixed(2)}
              <span className="text-sm text-gray-400 dark:text-gray-500 font-normal ml-1">/ {rubric.maxScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rubric Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden border border-black/5 dark:border-white/5 transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-6 text-left bg-gray-50/50 dark:bg-gray-800/50 border-b dark:border-white/5 w-64 font-bold text-gray-400 dark:text-gray-500 uppercase text-xs tracking-widest">Indicador</th>
                {rubric.indicators[0]?.levels.map((level, i) => (
                  <th key={i} className="p-6 text-center bg-gray-50/50 dark:bg-gray-800/50 border-b dark:border-white/5 font-bold text-gray-400 dark:text-gray-500 uppercase text-xs tracking-widest whitespace-normal min-w-[120px]">
                    {level.name}
                    <div className="text-[10px] mt-1 text-indigo-400">({level.score} pts)</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
                  {rubric.indicators.map((indicator, i) => (
                <tr key={indicator.id || i} className="group hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="p-6 border-b border-gray-100 dark:border-white/5 align-top">
                    <div className="font-bold text-gray-900 dark:text-white mb-1">{indicator.name}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 italic">Peso: {indicator.weight}</div>
                  </td>
                  {indicator.levels.map((level, j) => {
                    // Match by ID if both exist, otherwise fallback to index for legacy data
                    const isSelected = (indicator.id && level.id && currentEvaluation.selections[indicator.id] === level.id) || 
                                     (currentEvaluation.selections[i] !== undefined && currentEvaluation.selections[i] == j) ||
                                     ((currentEvaluation.selections as any)[i] !== undefined && (currentEvaluation.selections as any)[i] == j);
                    return (
                      <td 
                        key={level.id || j} 
                        onClick={() => handleSelect(indicator, level, i, j)}
                        className={cn(
                          "p-6 border-b border-gray-100 dark:border-white/5 cursor-pointer transition-all relative",
                          isSelected 
                            ? "bg-indigo-50/80 dark:bg-indigo-900/30 ring-2 ring-indigo-500/20 dark:ring-indigo-400/20 z-10" 
                            : "hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 fill-white dark:fill-gray-900" />
                          </div>
                        )}
                        <div className={cn(
                          "text-sm leading-relaxed",
                          isSelected ? "text-indigo-900 dark:text-indigo-100 font-medium" : "text-gray-600 dark:text-gray-400"
                        )}>
                          {level.description || <span className="text-gray-300 dark:text-gray-600 italic">Sin descripción</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary / Progress */}
      <div className="flex justify-between items-center p-6 bg-gray-900 dark:bg-black text-white rounded-3xl shadow-2xl transition-colors border dark:border-white/5">
        <div className="flex items-center gap-6">
          <div className="h-2 w-48 bg-gray-800 dark:bg-gray-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500" 
              style={{ width: `${(Object.keys(currentEvaluation.selections).length / rubric.indicators.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
            {Object.keys(currentEvaluation.selections).length} de {rubric.indicators.length} indicadores completados
          </span>
        </div>
        
        <div className="flex gap-3">
          <button onClick={onClose} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm font-bold">
            Finalizar Evaluación
          </button>
        </div>
      </div>
    </div>
  );
};
