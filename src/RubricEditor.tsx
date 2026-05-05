import React, { useState } from 'react';
import { Indicator, Level, Rubric } from './types';
import { parsePastedRubric, generateId } from './utils';
import { Plus, Trash2, Save, X, Clipboard, Download, Upload } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

interface RubricEditorProps {
  rubric?: Rubric;
  onSave: () => void;
  onCancel: () => void;
}

export const RubricEditor: React.FC<RubricEditorProps> = ({ rubric, onSave, onCancel }) => {
  const { profile } = useAuth();
  const ownerId = profile?.impersonatedBy || profile?.uid;

  const [title, setTitle] = useState(rubric?.title || '');
  const [description, setDescription] = useState(rubric?.description || '');
  const [maxScore, setMaxScore] = useState(rubric?.maxScore || 10);
  const [indicators, setIndicators] = useState<Indicator[]>(rubric?.indicators || [
    { id: generateId(), name: 'Indicador 1', weight: 1, levels: [
      { id: generateId(), name: 'Excelente', score: 4, description: '' },
      { id: generateId(), name: 'Bueno', score: 3, description: '' },
      { id: generateId(), name: 'Suficiente', score: 2, description: '' },
      { id: generateId(), name: 'Insuficiente', score: 1, description: '' }
    ]}
  ]);
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

  const handleSave = async () => {
    if (!ownerId) return;
    const data = {
      ownerId,
      title,
      description,
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
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ title, description, maxScore, indicators }));
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
          setMaxScore(json.maxScore || 10);
          setIndicators(json.indicators || []);
        } catch (err) {
          alert('Error al importar el archivo JSON');
        }
      };
      reader.readAsText(file);
    }
  };

  if (pasteMode) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-xl max-w-4xl mx-auto border border-black/5">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Clipboard className="w-6 h-6 text-indigo-600" />
          Pegar Rúbrica
        </h2>
        <p className="text-gray-600 mb-4 text-sm">
          Pega una tabla desde Word, Google Docs o Markdown. El sistema intentará identificar los indicadores y niveles.
        </p>
        <textarea
          className="w-full h-64 p-4 border rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="Título
Indicador	Excelente (4)	Bueno (3)	Suficiente (2)	Insuficiente (1)
Contenido	Muy completo	Completo	Faltan cosas	Muy pobre"
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setPasteMode(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
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
    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-6xl mx-auto border border-black/5">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{rubric ? 'Editar Rúbrica' : 'Nueva Rúbrica'}</h2>
        <div className="flex gap-2">
          <button onClick={() => setPasteMode(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <Clipboard className="w-4 h-4" /> Pegar
          </button>
          <button onClick={exportRubric} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <label className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4" /> Importar
            <input type="file" accept=".json" onChange={importRubric} className="hidden" />
          </label>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Título de la rúbrica"
              className="w-full text-xl font-bold border-b-2 border-gray-200 focus:border-indigo-500 outline-none pb-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nota Máxima</label>
            <input
              type="number"
              className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
              value={maxScore}
              onChange={(e) => setMaxScore(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <textarea
          placeholder="Descripción (opcional)"
          className="w-full p-3 border rounded-xl text-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 text-left bg-gray-50 border border-gray-200 w-48">Indicador / Peso</th>
              {indicators[0]?.levels.map((level, i) => (
                <th key={i} className="p-3 text-left bg-gray-50 border border-gray-200 relative group min-w-40 whitespace-normal">
                  <textarea
                    className="w-full bg-transparent font-bold outline-none resize-none text-sm leading-tight"
                    rows={4}
                    value={level.name}
                    onChange={(e) => {
                      const newIndicators = indicators.map(ind => ({
                        ...ind,
                        levels: ind.levels.map((l, idx) => idx === i ? { ...l, name: e.target.value } : l)
                      }));
                      setIndicators(newIndicators);
                    }}
                  />
                  <button onClick={() => removeLevel(i)} className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </th>
              ))}
              <th className="p-3 bg-gray-50 border border-gray-200 w-12">
                <button onClick={addLevel} className="p-1 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200">
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((indicator, i) => (
              <tr key={i}>
                <td className="p-3 border border-gray-200 bg-gray-50 align-top">
                  <div className="space-y-2">
                    <textarea
                      className="w-full bg-transparent font-medium outline-none resize-none"
                      value={indicator.name}
                      onChange={(e) => updateIndicator(i, 'name', e.target.value)}
                      rows={2}
                    />
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Peso:</span>
                      <input
                        type="number"
                        className="w-12 p-1 border rounded"
                        value={indicator.weight}
                        onChange={(e) => updateIndicator(i, 'weight', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <button onClick={() => removeIndicator(i)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                {indicator.levels.map((level, j) => (
                  <td key={j} className="p-3 border border-gray-200 align-top">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-indigo-600">Puntos:</span>
                        <input
                          type="number"
                          className="w-12 p-1 text-xs border rounded"
                          value={level.score}
                          onChange={(e) => updateLevel(i, j, 'score', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <textarea
                        className="w-full text-sm text-gray-600 outline-none min-h-20 resize-none"
                        placeholder="Descripción del nivel..."
                        value={level.description}
                        onChange={(e) => updateLevel(i, j, 'description', e.target.value)}
                      />
                    </div>
                  </td>
                ))}
                <td className="border border-gray-200"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={addIndicator} className="mt-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium">
        <Plus className="w-5 h-5" /> Añadir Indicador
      </button>

      <div className="flex justify-end gap-3 mt-10 pt-6 border-t">
        <button onClick={onCancel} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave} className="flex items-center gap-2 px-8 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
          <Save className="w-5 h-5" /> Guardar Rúbrica
        </button>
      </div>
    </div>
  );
};
