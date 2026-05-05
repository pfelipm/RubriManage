import React, { useState } from 'react';
import { Group, Student } from './types';
import { Plus, Trash2, Save, X, UserPlus, Users, Clipboard } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

interface GroupManagerProps {
  group?: Group;
  onSave: () => void;
  onCancel: () => void;
}

export const GroupManager: React.FC<GroupManagerProps> = ({ group, onSave, onCancel }) => {
  const { profile } = useAuth();
  const ownerId = profile?.impersonatedBy || profile?.uid;

  const [name, setName] = useState(group?.name || '');
  const [students, setStudents] = useState<Student[]>(group?.students || []);
  const [newStudentName, setNewStudentName] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addStudent = () => {
    if (newStudentName.trim()) {
      setStudents([...students, { id: generateId(), name: newStudentName.trim() }]);
      setNewStudentName('');
    }
  };

  const handlePaste = () => {
    const names = pasteText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    const newStudents = names.map(name => ({
      id: generateId(),
      name
    }));

    setStudents([...students, ...newStudents]);
    setPasteText('');
    setPasteMode(false);
  };

  const removeStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
  };

  const handleSave = async () => {
    if (!ownerId || !name.trim()) return;
    const data = {
      ownerId,
      name,
      students,
      updatedAt: new Date()
    };

    if (group?.id) {
      await updateDoc(doc(db, 'groups', group.id), data);
    } else {
      await addDoc(collection(db, 'groups'), { ...data, createdAt: new Date() });
    }
    onSave();
  };

  if (pasteMode) {
    return (
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl max-w-2xl mx-auto border border-black/5 dark:border-white/5 transition-colors">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Clipboard className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Pegar Estudiantes</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-widest">Añadir lista rápidamente</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm font-medium">
          Pega una lista de nombres (uno por línea). Se añadirán a los estudiantes actuales.
        </p>
        <textarea
          className="w-full h-64 p-4 border dark:border-white/10 rounded-2xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 dark:bg-gray-800 dark:text-white transition-colors"
          placeholder="Juan Pérez&#10;María García&#10;Carlos Rodríguez..."
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setPasteMode(false)} className="px-6 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-bold text-sm">
            Cancelar
          </button>
          <button onClick={handlePaste} className="px-8 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 font-bold text-sm">
            Añadir Estudiantes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl max-w-2xl mx-auto border border-black/5 dark:border-white/5 transition-colors">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
          <Users className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{group ? 'Editar Grupo' : 'Nuevo Grupo'}</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-widest">Gestión de Estudiantes</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nombre del Grupo</label>
          <input
            type="text"
            placeholder="Ej: Matemáticas 1ºA"
            className="w-full text-xl font-bold border-b-2 border-gray-100 dark:border-white/5 focus:border-indigo-500 outline-none pb-2 transition-all bg-transparent dark:text-white placeholder:text-gray-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Añadir Estudiante</label>
            <button 
              onClick={() => setPasteMode(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-all"
            >
              <Clipboard className="w-3.5 h-3.5" /> Pegar Lista
            </button>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Nombre completo..."
              className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white placeholder:text-gray-400"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addStudent()}
            />
            <button 
              onClick={addStudent} 
              className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40"
            >
              <UserPlus className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Lista de Estudiantes ({students.length})</label>
          {students.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-white/5 text-gray-400 font-medium italic">
              No hay estudiantes en este grupo
            </div>
          ) : (
            [...students].sort((a, b) => a.name.localeCompare(b.name)).map((student, i) => (
              <div key={student.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-white/5 rounded-2xl hover:border-indigo-200 dark:hover:border-indigo-400/30 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-indigo-400 w-6">{i + 1}.</span>
                  <span className="font-bold text-gray-700 dark:text-gray-200">{student.name}</span>
                </div>
                <button 
                  onClick={() => removeStudent(student.id)} 
                  className="p-2 text-gray-300 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-gray-100 dark:border-white/10">
        <button onClick={onCancel} className="px-6 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-bold text-sm">
          Cancelar
        </button>
        <button onClick={handleSave} className="flex items-center gap-2 px-8 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 font-bold text-sm">
          <Save className="w-5 h-5" /> Guardar Grupo
        </button>
      </div>
    </div>
  );
};
