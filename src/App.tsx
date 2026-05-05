import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { Rubric, Group } from './types';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MainApp: React.FC = () => {
  const { profile, impersonatedProfile, logout, stopImpersonation } = useAuth();
  const ownerId = profile?.impersonatedBy || profile?.uid;

  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [view, setView] = useState<'list' | 'editor' | 'groupManager' | 'evaluator' | 'dashboard' | 'admin'>('list');
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [openRubricMenu, setOpenRubricMenu] = useState<string | null>(null);
  const [openGroupMenu, setOpenGroupMenu] = useState<string | null>(null);

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

    return () => {
      rubricsUnsubscribe();
      groupsUnsubscribe();
    };
  }, [ownerId]);

  const handleDeleteRubric = async (id: string) => {
    if (window.confirm('¿Eliminar esta rúbrica?')) {
      await deleteDoc(doc(db, 'rubrics', id));
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm('¿Eliminar este grupo?')) {
      await deleteDoc(doc(db, 'groups', id));
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
      <div className="min-h-screen bg-gray-50 p-6">
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
      <div className="min-h-screen bg-gray-50 p-6">
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
      <div className="min-h-screen bg-gray-50 p-6">
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
      <div className="min-h-screen bg-gray-50 p-6">
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto mb-6">
          <button onClick={() => setView('list')} className="text-indigo-600 font-bold flex items-center gap-2 hover:underline">
            Volver al Inicio
          </button>
        </div>
        <AdminPanel onImpersonate={() => setView('list')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-black/5 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">RubriManage</h1>
        </div>

        <div className="flex items-center gap-4">
          {profile?.impersonatedBy && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
              <Shield className="w-3.5 h-3.5" /> 
              <span>Impersonando a <span className="underline">{impersonatedProfile?.email || '...'}</span></span>
              <button onClick={stopImpersonation} className="hover:underline ml-1 text-amber-900">Detener</button>
            </div>
          )}
          
          <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-2xl border border-gray-100">
            <UserCircle className="w-5 h-5 text-gray-400" />
            <div className="text-sm">
              <div className="font-bold text-gray-900 leading-none">{profile?.email}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">{profile?.role}</div>
            </div>
          </div>

          {profile?.role === 'admin' && (
            <button 
              onClick={() => setView('admin')}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="Panel de Administración"
            >
              <Shield className="w-6 h-6" />
            </button>
          )}

          <button 
            onClick={logout}
            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            title="Cerrar Sesión"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 space-y-12">
        {/* Rubrics Section */}
        <section>
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Tus Rúbricas</h2>
              <p className="text-gray-500 font-medium">Crea y gestiona tus criterios de evaluación</p>
            </div>
            <button 
              onClick={() => { setSelectedRubric(null); setView('editor'); }}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 font-bold"
            >
              <Plus className="w-5 h-5" /> Nueva Rúbrica
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {rubrics.length === 0 ? (
                <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                  <FileText className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-bold">No tienes rúbricas todavía</p>
                  <p className="text-sm">Empieza creando una nueva o pegando una tabla</p>
                </div>
              ) : (
                rubrics.map((r) => (
                  <motion.div 
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedRubric(r); setView('editor'); }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRubric(r.id)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2 line-clamp-1">{r.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-6 min-h-[2.5rem]">{r.description || 'Sin descripción'}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
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
                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-black/5 p-2 z-30">
                                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest p-2 border-b mb-1">Selecciona Grupo</div>
                                  {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map(g => (
                                    <button 
                                      key={g.id}
                                      onClick={() => { setSelectedRubric(r); setSelectedGroup(g); setView('evaluator'); setOpenRubricMenu(null); }}
                                      className="w-full text-left p-2 hover:bg-indigo-50 rounded-lg text-sm font-bold text-gray-700 flex items-center justify-between"
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
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Tus Grupos</h2>
              <p className="text-gray-500 font-medium">Gestiona tus clases y estudiantes</p>
            </div>
            <button 
              onClick={() => { setSelectedGroup(null); setView('groupManager'); }}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all font-bold"
            >
              <Plus className="w-5 h-5" /> Nuevo Grupo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {groups.length === 0 ? (
                <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                  <Users className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-bold">No tienes grupos todavía</p>
                  <p className="text-sm">Añade tus clases para empezar a evaluar</p>
                </div>
              ) : (
                groups.map((g) => (
                  <motion.div 
                    key={g.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedGroup(g); setView('groupManager'); }}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteGroup(g.id)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2 line-clamp-1">{g.name}</h3>
                    <p className="text-sm text-gray-500 mb-6">{g.students.length} Estudiantes</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="flex -space-x-2">
                        {[...g.students].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 4).map((s, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400">
                            {s.name[0]}
                          </div>
                        ))}
                        {g.students.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400">
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
                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-black/5 p-2 z-30">
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest p-2 border-b mb-1">Selecciona Rúbrica</div>
                              {[...rubrics].sort((a, b) => a.title.localeCompare(b.title)).map(r => (
                                <button 
                                  key={r.id}
                                  onClick={() => { setSelectedGroup(g); setSelectedRubric(r); setView('dashboard'); setOpenGroupMenu(null); }}
                                  className="w-full text-left p-2 hover:bg-emerald-50 rounded-lg text-sm font-bold text-gray-700 flex items-center justify-between"
                                >
                                  {r.title}
                                  <ChevronRight className="w-3.5 h-3.5 opacity-30" />
                                </button>
                              ))}
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
        className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center relative z-10"
      >
        <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200">
          <GraduationCap className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">RubriManage</h1>
        <p className="text-gray-500 mb-10 font-medium leading-relaxed">
          La herramienta definitiva para la gestión de rúbricas y evaluación ágil de estudiantes.
        </p>
        <button 
          onClick={login}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 group"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 group-hover:rotate-12 transition-transform" alt="Google" />
          Entrar con Google
        </button>
        <p className="mt-8 text-xs text-gray-400 font-bold uppercase tracking-widest">
          Para profesores y centros educativos
        </p>
      </motion.div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    </ErrorBoundary>
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
