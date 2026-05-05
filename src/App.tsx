import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { Rubric, Group } from './types';
import { collection, query, where, onSnapshot, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { RubricEditor } from './RubricEditor';
import { GroupManager } from './GroupManager';
import { Evaluator } from './Evaluator';
import { Dashboard } from './Dashboard';
import { AdminPanel } from './AdminPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  Plus, 
  Users, 
  FileText, 
  Play, 
  LayoutDashboard, 
  Trash2, 
  Edit, 
  LogOut, 
  Shield, 
  UserCircle,
  ChevronRight,
  GraduationCap,
  AlertCircle,
  Copy,
  Search,
  Info,
  Linkedin,
  Github,
  X as CloseIcon,
  Moon,
  Sun,
  Monitor,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MainApp: React.FC = () => {
  const { profile, impersonatedProfile, logout, stopImpersonation } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const ownerId = profile?.impersonatedBy || profile?.uid;

  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [view, setView] = useState<'list' | 'editor' | 'groupManager' | 'evaluator' | 'dashboard' | 'admin'>('list');
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [openRubricMenu, setOpenRubricMenu] = useState<string | null>(null);
  const [openGroupMenu, setOpenGroupMenu] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'rubric' | 'group', id: string, name: string } | null>(null);

  const [rubricSearch, setRubricSearch] = useState('');
  const [rubricSort, setRubricSort] = useState<'A-Z' | 'Z-A'>('A-Z');
  
  const [groupSearch, setGroupSearch] = useState('');
  const [groupSort, setGroupSort] = useState<'A-Z' | 'Z-A'>('A-Z');

  const [showAttribution, setShowAttribution] = useState(false);

  // Track which groups have evaluations for which rubrics
  const [groupRubricLinks, setGroupRubricLinks] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    if (!ownerId) return;

    const rubricsQ = query(collection(db, 'rubrics'), where('ownerId', '==', ownerId));
    const rubricsUnsubscribe = onSnapshot(rubricsQ, (snapshot) => {
      setRubrics(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Rubric)));
    }, (error) => {
      console.error("Error fetching rubrics:", error);
    });

    const groupsQ = query(collection(db, 'groups'), where('ownerId', '==', ownerId));
    const groupsUnsubscribe = onSnapshot(groupsQ, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Group)));
    }, (error) => {
      console.error("Error fetching groups:", error);
    });

    const evalQ = query(collection(db, 'evaluations'), where('ownerId', '==', ownerId));
    const evalUnsubscribe = onSnapshot(evalQ, (snapshot) => {
      const links: Record<string, Set<string>> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.groupId && data.rubricId) {
          if (!links[data.groupId]) {
            links[data.groupId] = new Set();
          }
          links[data.groupId].add(data.rubricId);
        }
      });
      setGroupRubricLinks(links);
    });

    return () => {
      rubricsUnsubscribe();
      groupsUnsubscribe();
      evalUnsubscribe();
    };
  }, [ownerId]);

  const handleDeleteRubric = (id: string, name: string) => {
    setDeleteConfirm({ type: 'rubric', id, name });
  };

  const handleDeleteGroup = (id: string, name: string) => {
    setDeleteConfirm({ type: 'group', id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'rubric') {
        await deleteDoc(doc(db, 'rubrics', deleteConfirm.id));
      } else if (deleteConfirm.type === 'group') {
        await deleteDoc(doc(db, 'groups', deleteConfirm.id));
      }
    } catch (error) {
      console.error(`Error deleting ${deleteConfirm.type}:`, error);
    }
    setDeleteConfirm(null);
  };

  const handleDuplicateRubric = async (rubric: Rubric) => {
    if (!ownerId) return;
    const { id, ...rest } = rubric; // exclude original id
    
    const duplicatedRubric = {
      ...rest,
      title: `${rubric.title} (Copia)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      await addDoc(collection(db, 'rubrics'), duplicatedRubric);
    } catch (error) {
      console.error("Error duplicating rubric:", error);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center border border-black/5">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Perfil no encontrado</h2>
          <p className="text-gray-500 mb-10 font-medium leading-relaxed">
            No hemos podido cargar tu perfil de usuario. Esto puede deberse a un problema de conexión o permisos.
          </p>
          <button 
            onClick={logout}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-3"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión e intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  if (view === 'editor') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 transition-colors">
        <RubricEditor 
          rubric={selectedRubric || undefined} 
          onSave={() => setView('list')} 
          onCancel={() => setView('list')} 
        />
      </div>
    );
  }

  if (view === 'groupManager') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 transition-colors">
        <GroupManager 
          group={selectedGroup || undefined} 
          onSave={() => setView('list')} 
          onCancel={() => setView('list')} 
        />
      </div>
    );
  }

  if (view === 'evaluator' && selectedRubric && selectedGroup) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 transition-colors">
        <Evaluator 
          rubric={selectedRubric} 
          group={selectedGroup} 
          onClose={() => setView('list')} 
        />
      </div>
    );
  }

  if (view === 'dashboard' && selectedRubric && selectedGroup) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 transition-colors">
        <Dashboard 
          rubric={selectedRubric} 
          group={selectedGroup} 
          onClose={() => setView('list')} 
        />
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 transition-colors">
        <div className="max-w-6xl mx-auto mb-6">
          <button onClick={() => setView('list')} className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2 hover:underline">
            Volver al Inicio
          </button>
        </div>
        <AdminPanel onImpersonate={() => setView('list')} />
      </div>
    );
  }

  const filteredRubrics = [...rubrics]
    .filter(r => r.title.toLowerCase().includes(rubricSearch.toLowerCase()) || r.description?.toLowerCase().includes(rubricSearch.toLowerCase()))
    .sort((a, b) => rubricSort === 'A-Z' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title));

  const filteredGroups = [...groups]
    .filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
    .sort((a, b) => groupSort === 'A-Z' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-900 border-b border-black/5 dark:border-white/5 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">RubriManage</h1>
          <button 
            onClick={() => setShowAttribution(true)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all ml-2"
            title="Información de la App"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all flex items-center gap-2 group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900"
            title={`Modo: ${theme === 'system' ? 'Automático' : theme === 'light' ? 'Claro' : 'Oscuro'}`}
          >
            {theme === 'system' && <Monitor className="w-5 h-5" />}
            {theme === 'light' && <Sun className="w-5 h-5 text-amber-500" />}
            {theme === 'dark' && <Moon className="w-5 h-5 text-indigo-400" />}
            <span className="text-[10px] font-black uppercase tracking-tighter hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
              {theme === 'system' ? 'Auto' : theme === 'light' ? 'Manual' : 'Manual'}
            </span>
          </button>
          
          {profile?.impersonatedBy && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-900/30">
              <Shield className="w-3.5 h-3.5" /> 
              <span>Impersonando a <span className="underline">{impersonatedProfile?.email || '...'}</span></span>
              <button onClick={stopImpersonation} className="hover:underline ml-1 text-amber-900 dark:text-amber-200">Detener</button>
            </div>
          )}
          
          <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-white/5">
            <UserCircle className="w-5 h-5 text-gray-400" />
            <div className="text-sm">
              <div className="font-bold text-gray-900 dark:text-gray-100 leading-none">{profile?.email}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">{profile?.role}</div>
            </div>
          </div>

          {profile?.role === 'admin' && (
            <button 
              onClick={() => setView('admin')}
              className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
              title="Panel de Administración"
            >
              <Shield className="w-6 h-6" />
            </button>
          )}

          <button 
            onClick={logout}
            className="p-2 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
            title="Cerrar Sesión"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-12">
        {/* Rubrics Section */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Tus Rúbricas</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Crea y gestiona tus criterios de evaluación</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex-1 md:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 flex items-center shadow-sm">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="Buscar rúbrica..." 
                  value={rubricSearch}
                  onChange={(e) => setRubricSearch(e.target.value)}
                  className="w-full text-sm outline-none bg-transparent dark:text-white"
                />
              </div>
              <select 
                value={rubricSort} 
                onChange={(e) => setRubricSort(e.target.value as 'A-Z' | 'Z-A')}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="A-Z">A-Z</option>
                <option value="Z-A">Z-A</option>
              </select>
              <button 
                onClick={() => { setSelectedRubric(null); setView('editor'); }}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40 font-bold"
              >
                <Plus className="w-5 h-5" /> Nueva Rúbrica
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredRubrics.length === 0 ? (
                <div className="col-span-full py-20 bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center text-gray-400">
                  <FileText className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-bold">No se encontraron rúbricas</p>
                  <p className="text-sm">Intenta buscar con otros términos o crea una nueva</p>
                </div>
              ) : (
                filteredRubrics.map((r) => (
                  <motion.div 
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleDuplicateRubric(r)}
                          className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setSelectedRubric(r); setView('editor'); }}
                          className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRubric(r.id, r.title)}
                          className="p-2 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 line-clamp-1">{r.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 min-h-[2.5rem]">{r.description || 'Sin descripción'}</p>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
                      {r.author && (
                        <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg">
                          <UserCircle className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">{r.author}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {r.createdAt ? (
                            r.createdAt instanceof Date ? r.createdAt.toLocaleDateString() : 
                            (r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : new Date(r.createdAt).toLocaleDateString())
                          ) : 'Reciente'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-white/5">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {r.indicators.length} Indicadores
                      </span>
                      <div className="flex gap-2">
                        {groups.length > 0 && (
                          <div className="relative">
                            <button 
                              onClick={() => setOpenRubricMenu(openRubricMenu === r.id ? null : r.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all"
                            >
                              <Play className="w-3.5 h-3.5" /> Evaluar
                            </button>
                            {openRubricMenu === r.id && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setOpenRubricMenu(null)} />
                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 p-2 z-30">
                                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest p-2 border-b dark:border-white/5 mb-1">Selecciona Grupo</div>
                                  {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map(g => (
                                    <button 
                                      key={g.id}
                                      onClick={() => { setSelectedRubric(r); setSelectedGroup(g); setView('evaluator'); setOpenRubricMenu(null); }}
                                      className="w-full text-left p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between"
                                    >
                                      {g.name}
                                      <ChevronRight className="w-3.5 h-3.5 opacity-30" />
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Groups Section */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Tus Grupos</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Gestiona tus clases y estudiantes</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex-1 md:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 flex items-center shadow-sm">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="Buscar grupo..." 
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="w-full text-sm outline-none bg-transparent dark:text-white"
                />
              </div>
              <select 
                value={groupSort} 
                onChange={(e) => setGroupSort(e.target.value as 'A-Z' | 'Z-A')}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="A-Z">A-Z</option>
                <option value="Z-A">Z-A</option>
              </select>
              <button 
                onClick={() => { setSelectedGroup(null); setView('groupManager'); }}
                className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-gray-900 border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all font-bold"
              >
                <Plus className="w-5 h-5" /> Nuevo Grupo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredGroups.length === 0 ? (
                <div className="col-span-full py-20 bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center text-gray-400">
                  <Users className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-bold">No se encontraron grupos</p>
                  <p className="text-sm">Intenta buscar con otros términos o crea uno nuevo</p>
                </div>
              ) : (
                filteredGroups.map((g) => (
                  <motion.div 
                    key={g.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedGroup(g); setView('groupManager'); }}
                          className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteGroup(g.id, g.name)}
                          className="p-2 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 line-clamp-1">{g.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{g.students.length} Estudiantes</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-white/5">
                      <div className="flex -space-x-2">
                        {[...g.students].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 4).map((s, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-bold text-gray-400">
                            {s.name[0]}
                          </div>
                        ))}
                        {g.students.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-bold text-gray-400">
                            +{g.students.length - 4}
                          </div>
                        )}
                      </div>
                      
                      <div className="relative">
                        <button 
                          onClick={() => setOpenGroupMenu(openGroupMenu === g.id ? null : g.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5" /> Dashboards
                        </button>
                        {openGroupMenu === g.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenGroupMenu(null)} />
                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 p-2 z-30">
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest p-2 border-b dark:border-white/5 mb-1">Selecciona Rúbrica</div>
                              {(!groupRubricLinks[g.id] || groupRubricLinks[g.id].size === 0) ? (
                                <div className="text-xs text-gray-500 text-center p-3 italic">
                                  No hay evaluaciones
                                </div>
                              ) : (
                                [...rubrics]
                                  .filter(r => groupRubricLinks[g.id].has(r.id))
                                  .sort((a, b) => a.title.localeCompare(b.title))
                                  .map(r => (
                                    <button 
                                      key={r.id}
                                      onClick={() => { setSelectedGroup(g); setSelectedRubric(r); setView('dashboard'); setOpenGroupMenu(null); }}
                                      className="w-full text-left p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between"
                                    >
                                      {r.title}
                                      <ChevronRight className="w-3.5 h-3.5 opacity-30" />
                                    </button>
                                  ))
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-black/5 dark:border-white/5 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Eliminar {deleteConfirm.type === 'rubric' ? 'rúbrica' : 'grupo'}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium leading-relaxed">
                ¿Estás seguro de que deseas eliminar <span className="font-bold text-gray-900 dark:text-white">"{deleteConfirm.name}"</span>? 
                <br /><br />
                <span className="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-lg">Esta acción no se puede deshacer.</span>
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 dark:shadow-rose-900/40"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attribution Modal */}
      <AnimatePresence>
        {showAttribution && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-[2rem] p-8 md:p-10 max-w-2xl w-full shadow-2xl relative overflow-hidden border border-black/5 dark:border-white/10 transition-colors"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowAttribution(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-all"
              >
                <CloseIcon className="w-6 h-6" />
              </button>

              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center shadow-inner">
                      <GraduationCap className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="text-4xl font-black tracking-tight leading-none text-gray-900 dark:text-white">RubriManage</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-2 px-1">
                        ACTUALIZADO: 5 DE MAYO DE 2026
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg font-medium">
                    <p>
                      <span className="font-bold text-gray-900 dark:text-white">RubriManage</span> es una herramienta de evaluación <span className="italic">eficiente y centrada en el flujo de trabajo</span> nacida para simplificar la vida a los docentes. Olvida las hojas de cálculo complejas: aquí evalúas con un clic y obtienes analíticas en tiempo real.
                    </p>
                    <p>
                      Esta aplicación surge para automatizar el "Workflow de Evaluación": crea rúbricas, gestiona grupos, evalúa mediante indicadores con atajos de teclado y visualiza el progreso del aula. Todo en una interfaz limpia, rápida y con cariño por la experiencia docente.
                    </p>
                    <p className="pt-2">
                      Creado por <span className="text-indigo-600 dark:text-indigo-400 font-bold">Pablo Felip</span> y distribuido bajo licencia libre.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-20" />
                    <img 
                      src="https://drive.google.com/thumbnail?id=1pbNyTrnZeZvfWLu2Lm66f9tVQ3OqTKHx&sz=w500-h500" 
                      alt="Pablo Felip" 
                      referrerPolicy="no-referrer"
                      className="w-36 h-36 rounded-full border-4 border-gray-100 dark:border-gray-800 shadow-2xl relative z-10 grayscale hover:grayscale-0 transition-all duration-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-12 flex items-center justify-between border-t border-gray-100 dark:border-white/10 pt-6">
                <div className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                  © 2026 Pablo Felip
                </div>
                <div className="flex gap-6">
                  <a 
                    href="https://github.com/pfelipm/RubriManage" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-white transition-colors font-bold"
                  >
                    <Github className="w-5 h-5" /> 
                    <span className="text-sm">GitHub</span>
                  </a>
                  <a 
                    href="https://www.linkedin.com/in/pfelipm" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-white transition-colors font-bold"
                  >
                    <Linkedin className="w-5 h-5 fill-current" /> 
                    <span className="text-sm">LinkedIn</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LoginView: React.FC = () => {
  const { login } = useAuth();
  return (
    <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center relative z-10 transition-colors"
      >
        <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40">
          <GraduationCap className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">RubriManage</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-10 font-medium leading-relaxed">
          La herramienta definitiva para la gestión de rúbricas y evaluación ágil de estudiantes.
        </p>
        <button 
          onClick={login}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40 flex items-center justify-center gap-3 group"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 group-hover:rotate-12 transition-transform" alt="Google" />
          Entrar con Google
        </button>
        <p className="mt-8 text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
          Para profesores y centros educativos
        </p>
      </motion.div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

const AuthConsumer: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-indigo-600 font-black tracking-widest uppercase text-xs">Cargando...</p>
        </div>
      </div>
    );
  }

  return user ? <MainApp /> : <LoginView />;
}
