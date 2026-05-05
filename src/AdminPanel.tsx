import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, deleteDoc, doc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from './types';
import { useAuth } from './AuthContext';
import { Shield, Users, Trash2, UserCheck, UserX, Search, Activity, FileText } from 'lucide-react';

export const AdminPanel: React.FC<{ onImpersonate?: () => void }> = ({ onImpersonate }) => {
  const { profile, impersonate, stopImpersonation } = useAuth();
  const [users, setUsers] = useState<(UserProfile & { rubricCount: number; groupCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      
      const enrichedUsers = await Promise.all(usersData.map(async (u) => {
        const rubricsQ = query(collection(db, 'rubrics'), where('ownerId', '==', u.uid));
        const groupsQ = query(collection(db, 'groups'), where('ownerId', '==', u.uid));
        
        const [rubricsSnap, groupsSnap] = await Promise.all([
          getDocs(rubricsQ),
          getDocs(groupsQ)
        ]);

        return {
          ...u,
          rubricCount: rubricsSnap.size,
          groupCount: groupsSnap.size
        };
      }));

      setUsers(enrichedUsers);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleImpersonate = async (uid: string) => {
    await impersonate(uid);
    if (onImpersonate) onImpersonate();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario y todos sus datos? Esta acción es irreversible.')) return;

    const batch = writeBatch(db);
    
    // Delete user's rubrics
    const rubricsQ = query(collection(db, 'rubrics'), where('ownerId', '==', userId));
    const rubricsSnapshot = await getDocs(rubricsQ);
    rubricsSnapshot.docs.forEach(d => batch.delete(d.ref));

    // Delete user's groups
    const groupsQ = query(collection(db, 'groups'), where('ownerId', '==', userId));
    const groupsSnapshot = await getDocs(groupsQ);
    groupsSnapshot.docs.forEach(d => batch.delete(d.ref));

    // Delete user's evaluations
    const evalsQ = query(collection(db, 'evaluations'), where('ownerId', '==', userId));
    const evalsSnapshot = await getDocs(evalsQ);
    evalsSnapshot.docs.forEach(d => batch.delete(d.ref));

    // Delete user profile
    batch.delete(doc(db, 'users', userId));

    await batch.commit();
    setUsers(users.filter(u => u.uid !== userId));
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.role !== 'admin') return <div className="p-20 text-center text-red-500 font-bold">Acceso Denegado</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg shadow-indigo-200">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Panel de Administración</h2>
            <p className="text-gray-500 font-medium text-sm uppercase tracking-widest">Gestión Global de Usuarios</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-black/5 shadow-sm">
          <Search className="w-5 h-5 text-gray-400 ml-2" />
          <input 
            type="text" 
            placeholder="Buscar usuario..." 
            className="bg-transparent border-none outline-none text-sm font-medium w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Usuarios Totales</div>
            <div className="text-3xl font-black text-gray-900">{users.length}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Estado del Sistema</div>
            <div className="text-3xl font-black text-emerald-600">Activo</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-black/5 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-6 font-bold text-gray-400 uppercase text-xs tracking-widest">Usuario</th>
              <th className="p-6 font-bold text-gray-400 uppercase text-xs tracking-widest">Rol</th>
              <th className="p-6 font-bold text-gray-400 uppercase text-xs tracking-widest">Actividad</th>
              <th className="p-6 font-bold text-gray-400 uppercase text-xs tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((u) => (
              <tr key={u.uid} className="hover:bg-gray-50/50 transition-colors group">
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                      {u.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{u.email}</div>
                      <div className="text-xs text-gray-400 font-mono">{u.uid}</div>
                    </div>
                  </div>
                </td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-6">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-bold text-gray-700">{u.rubricCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold text-gray-700">{u.groupCount}</span>
                    </div>
                  </div>
                </td>
                <td className="p-6 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {profile?.impersonatedBy === u.uid ? (
                      <button 
                        onClick={stopImpersonation}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors text-xs font-bold"
                      >
                        <UserX className="w-4 h-4" /> Detener Impersonación
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleImpersonate(u.uid)}
                        disabled={u.uid === profile?.uid}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors text-xs font-bold disabled:opacity-30"
                      >
                        <UserCheck className="w-4 h-4" /> Impersonar
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteUser(u.uid)}
                      disabled={u.uid === profile?.uid}
                      className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-30"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
