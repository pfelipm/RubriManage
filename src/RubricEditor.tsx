import React, { useState } from 'react';
import { Indicator, Level, Rubric } from './types';
import { parsePastedRubric, generateId } from './utils';
import { Plus, Trash2, Save, X, Clipboard, Download, Upload, GripVertical, SortAsc, SortDesc, ChevronLeft, ChevronRight, RefreshCw, Calendar, User as UserIcon } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableRowProps {
  indicator: Indicator;
  index: number;
  indicators: Indicator[];
  updateIndicator: (index: number, field: keyof Indicator, value: any) => void;
  removeIndicator: (index: number) => void;
  updateLevel: (indicatorIndex: number, levelIndex: number, field: keyof Level, value: any) => void;
}

const SortableIndicatorRow: React.FC<SortableRowProps> = ({ 
  indicator, 
  index, 
  indicators, 
  updateIndicator, 
  removeIndicator, 
  updateLevel 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: indicator.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? "shadow-2xl bg-indigo-50/50 dark:bg-indigo-900/20" : ""}>
      <td className="p-3 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/50 align-top">
        <div className="flex gap-2 items-start">
          <div 
            {...attributes} 
            {...listeners} 
            className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-indigo-500 transition-colors"
          >
            <GripVertical className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-2">
            <textarea
              className="w-full bg-transparent font-medium outline-none resize-none dark:text-white"
              value={indicator.name}
              onChange={(e) => updateIndicator(index, 'name', e.target.value)}
              rows={2}
            />
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Peso:</span>
              <input
                type="number"
                className="w-12 p-1 border dark:border-white/10 rounded dark:bg-gray-700 bg-white dark:text-white"
                value={indicator.weight}
                onChange={(e) => updateIndicator(index, 'weight', parseFloat(e.target.value) || 0)}
              />
            </div>
            <button onClick={() => removeIndicator(index)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </td>
      {indicator.levels.map((level, j) => (
        <td key={level.id} className="p-3 border border-gray-200 dark:border-white/10 align-top group-hover:bg-gray-50/10 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Puntos:</span>
              <input
                type="number"
                className="w-12 p-1 text-xs border dark:border-white/10 rounded bg-white dark:bg-gray-800 dark:text-white"
                value={level.score}
                onChange={(e) => updateLevel(index, j, 'score', parseFloat(e.target.value) || 0)}
              />
            </div>
            <textarea
              className="w-full text-sm text-gray-600 dark:text-gray-400 outline-none min-h-20 resize-none bg-transparent"
              placeholder="Descripción del nivel..."
              value={level.description}
              onChange={(e) => updateLevel(index, j, 'description', e.target.value)}
            />
          </div>
        </td>
      ))}
      <td className="border border-gray-200 dark:border-white/10"></td>
    </tr>
  );
};

interface RubricEditorProps {
  rubric?: Rubric;
  onSave: () => void;
  onCancel: () => void;
}

export const RubricEditor: React.FC<RubricEditorProps> = ({ rubric, onSave, onCancel }) => {
  const { user, profile } = useAuth();
  const ownerId = profile?.impersonatedBy || profile?.uid;

  const [title, setTitle] = useState(rubric?.title || '');
  const [description, setDescription] = useState(rubric?.description || '');
  const [author, setAuthor] = useState(rubric?.author || user?.displayName || user?.email || '');
  const [maxScore, setMaxScore] = useState(rubric?.maxScore || 10);
  const [indicators, setIndicators] = useState<Indicator[]>(() => {
    const initialIndicators = rubric?.indicators || [
      { id: generateId(), name: 'Indicador 1', weight: 1, levels: [
        { id: generateId(), name: 'Excelente', score: 4, description: '' },
        { id: generateId(), name: 'Bueno', score: 3, description: '' },
        { id: generateId(), name: 'Suficiente', score: 2, description: '' },
        { id: generateId(), name: 'Insuficiente', score: 1, description: '' }
      ]}
    ];
    return initialIndicators.map(ind => ({
      ...ind,
      id: ind.id || generateId(),
      levels: ind.levels.map(l => ({ ...l, id: l.id || generateId() }))
    }));
  });
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const addIndicator = () => {
    setIndicators([...indicators, { 
      id: generateId(),
      name: `Indicador ${indicators.length + 1}`, 
      weight: 1, 
      levels: indicators[0]?.levels.map(l => ({ ...l, id: generateId(), description: '' })) || [] 
    }]);
  };

  const removeIndicator = (index: number) => {
    setIndicators(indicators.filter((_, i) => i !== index));
  };

  const updateIndicator = (index: number, field: keyof Indicator, value: any) => {
    const newIndicators = [...indicators];
    newIndicators[index] = { ...newIndicators[index], [field]: value };
    setIndicators(newIndicators);
  };

  const addLevel = () => {
    const newIndicators = indicators.map(ind => ({
      ...ind,
      levels: [...ind.levels, { id: generateId(), name: `Nivel ${ind.levels.length + 1}`, score: 0, description: '' }]
    }));
    setIndicators(newIndicators);
  };

  const removeLevel = (levelIndex: number) => {
    const newIndicators = indicators.map(ind => ({
      ...ind,
      levels: ind.levels.filter((_, i) => i !== levelIndex)
    }));
    setIndicators(newIndicators);
  };

  const moveLevel = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= indicators[0].levels.length) return;
    setIndicators(prev => prev.map(ind => {
      const newLevels = [...ind.levels];
      const [removed] = newLevels.splice(fromIndex, 1);
      newLevels.splice(toIndex, 0, removed);
      return { ...ind, levels: newLevels };
    }));
  };

  const invertLevels = () => {
    setIndicators(prev => prev.map(ind => ({
      ...ind,
      levels: [...ind.levels].reverse()
    })));
  };

  const updateLevel = (indicatorIndex: number, levelIndex: number, field: keyof Level, value: any) => {
    const newIndicators = [...indicators];
    const newLevels = [...newIndicators[indicatorIndex].levels];
    newLevels[levelIndex] = { ...newLevels[levelIndex], [field]: value };
    newIndicators[indicatorIndex] = { ...newIndicators[indicatorIndex], levels: newLevels };
    setIndicators(newIndicators);
  };

  const handlePaste = () => {
    const parsed = parsePastedRubric(pasteText);
    setTitle(parsed.title);
    setIndicators(parsed.indicators);
    setPasteMode(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setIndicators((prevItems) => {
        const oldIndex = prevItems.findIndex((item) => item.id === active.id);
        const newIndex = prevItems.findIndex((item) => item.id === over.id);

        return arrayMove(prevItems, oldIndex, newIndex);
      });
    }
  };

  const sortIndicators = (direction: 'asc' | 'desc') => {
    setIndicators(prev => [...prev].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (direction === 'asc') return nameA.localeCompare(nameB, 'es');
      return nameB.localeCompare(nameA, 'es');
    }));
  };

  const handleSave = async () => {
    if (!ownerId) return;
    const data = {
      ownerId,
      title,
      description,
      author,
      maxScore,
      indicators,
      updatedAt: new Date()
    };

    if (rubric?.id) {
      await updateDoc(doc(db, 'rubrics', rubric.id), data);
    } else {
      await addDoc(collection(db, 'rubrics'), { ...data, createdAt: new Date() });
    }
    onSave();
  };

  const exportRubric = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ 
      title, 
      description, 
      author,
      maxScore, 
      indicators,
      createdAt: rubric?.createdAt 
    }));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${title}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importRubric = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setTitle(json.title || '');
          setDescription(json.description || '');
          setAuthor(json.author || user?.displayName || user?.email || '');
          setMaxScore(json.maxScore || 10);
          
          const importedIndicators = (json.indicators || []).map((ind: any) => ({
            ...ind,
            id: ind.id || generateId(),
            levels: (ind.levels || []).map((l: any) => ({
              ...l,
              id: l.id || generateId()
            }))
          }));
          
          setIndicators(importedIndicators);
        } catch (err) {
          alert('Error al importar el archivo JSON');
        }
      };
      reader.readAsText(file);
    }
  };

  if (pasteMode) {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl max-w-4xl mx-auto border border-black/5 dark:border-white/5 transition-colors">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 dark:text-white">
          <Clipboard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Pegar Rúbrica
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          Pega una tabla desde Word, Google Docs o Markdown. El sistema intentará identificar los indicadores y niveles.
        </p>
        <textarea
          className="w-full h-64 p-4 border dark:border-white/10 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-800 dark:text-white"
          placeholder="Título
Indicador	Excelente (4)	Bueno (3)	Suficiente (2)	Insuficiente (1)
Contenido	Muy completo	Completo	Faltan cosas	Muy pobre"
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setPasteMode(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={handlePaste} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            Procesar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl max-w-6xl mx-auto border border-black/5 dark:border-white/5 transition-colors">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold dark:text-white">{rubric ? 'Editar Rúbrica' : 'Nueva Rúbrica'}</h2>
        <div className="flex gap-2">
          <button onClick={() => setPasteMode(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Clipboard className="w-4 h-4" /> Pegar
          </button>
          <button onClick={exportRubric} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <label className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4" /> Importar
            <input type="file" accept=".json" onChange={importRubric} className="hidden" />
          </label>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 w-full">
            <input
              type="text"
              placeholder="Título de la rúbrica"
              className="w-full text-xl font-bold border-b-2 border-gray-200 dark:border-white/10 focus:border-indigo-500 outline-none pb-2 bg-transparent dark:text-white placeholder:text-gray-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nota Máxima</label>
            <input
              type="number"
              className="w-full p-2 border dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600 dark:text-indigo-400 dark:bg-gray-800"
              value={maxScore}
              onChange={(e) => setMaxScore(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <UserIcon className="w-3 h-3" /> Autor
            </label>
            <input
              type="text"
              className="w-full p-2.5 border dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-800 dark:text-white text-sm"
              placeholder="Nombre del autor"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <Calendar className="w-3 h-3" /> Fecha de Creación
            </label>
            <div className="w-full p-2.5 border dark:border-white/10 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed">
              {rubric?.createdAt ? (
                rubric.createdAt instanceof Date ? rubric.createdAt.toLocaleDateString() : 
                (rubric.createdAt?.toDate ? rubric.createdAt.toDate().toLocaleDateString() : new Date(rubric.createdAt).toLocaleDateString())
              ) : new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        <textarea
          placeholder="Descripción (opcional)"
          className="w-full p-3 border dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-800 placeholder:text-gray-400"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 w-48 text-gray-700 dark:text-gray-200 pl-10">
                  <div className="flex items-center justify-between">
                    <span>Indicador / Peso</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => sortIndicators('asc')}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Ordenar A-Z"
                      >
                        <SortAsc className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => sortIndicators('desc')}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Ordenar Z-A"
                      >
                        <SortDesc className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </th>
                {indicators[0]?.levels.map((level, i) => (
                  <th key={level.id} className="p-3 text-left bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 relative group min-w-40 whitespace-normal">
                    <div className="flex flex-col h-full">
                      <textarea
                        className="w-full bg-transparent font-bold outline-none resize-none text-sm leading-tight dark:text-white flex-1"
                        rows={3}
                        value={level.name}
                        onChange={(e) => {
                          const newIndicators = indicators.map(ind => ({
                            ...ind,
                            levels: ind.levels.map((l, idx) => idx === i ? { ...l, name: e.target.value } : l)
                          }));
                          setIndicators(newIndicators);
                        }}
                      />
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-white/5">
                        <div className="flex gap-1">
                          <button 
                            disabled={i === 0}
                            onClick={() => moveLevel(i, i - 1)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30 text-gray-500"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button 
                            disabled={i === indicators[0].levels.length - 1}
                            onClick={() => moveLevel(i, i + 1)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30 text-gray-500"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                        <button onClick={() => removeLevel(i)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
                <th className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-white/10 w-12 text-center">
                  <div className="flex flex-col gap-2 items-center">
                    <button onClick={addLevel} className="p-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors" title="Añadir Nivel">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={invertLevels} className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400" title="Invertir orden de niveles">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <SortableContext 
                items={indicators.map(ind => ind.id)} 
                strategy={verticalListSortingStrategy}
              >
                {indicators.map((indicator, i) => (
                  <SortableIndicatorRow 
                    key={indicator.id}
                    indicator={indicator}
                    index={i}
                    indicators={indicators}
                    updateIndicator={updateIndicator}
                    removeIndicator={removeIndicator}
                    updateLevel={updateLevel}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>

      <button onClick={addIndicator} className="mt-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors">
        <Plus className="w-5 h-5" /> Añadir Indicador
      </button>

      <div className="flex justify-end gap-3 mt-10 pt-6 border-t dark:border-white/10">
        <button onClick={onCancel} className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave} className="flex items-center gap-2 px-8 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
          <Save className="w-5 h-5" /> Guardar Rúbrica
        </button>
      </div>
    </div>
  );
};
