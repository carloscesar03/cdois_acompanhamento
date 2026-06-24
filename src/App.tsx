/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { User, ProgressGroup, ACTIVITIES } from './types';
import Login from './components/Login';
import MobileView from './components/MobileView';
import GridView from './components/GridView';
import AuditLogView from './components/AuditLogView';
import AdminPanel from './components/AdminPanel';
import PdfExportButton from './components/PdfExportButton';
import { LogOut, Eye, Settings, Shield, ListFilter, CheckSquare, Square, Menu, X, ChevronDown, Layers, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cdois_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'mobile' | 'grid' | 'audit' | 'admin'>(() => {
    return (localStorage.getItem('cdois_active_tab') as any) || 'mobile';
  });

  const [visibleActivities, setVisibleActivities] = useState<string[]>(() => {
    const saved = localStorage.getItem('cdois_visible_activities');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return ACTIVITIES.map(a => a.id);
      }
    }
    return ACTIVITIES.map(a => a.id);
  });

  const [progressData, setProgressData] = useState<{ [groupId: string]: ProgressGroup }>({});
  const [loading, setLoading] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync session and options to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cdois_user_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('cdois_user_session');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('cdois_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('cdois_visible_activities', JSON.stringify(visibleActivities));
  }, [visibleActivities]);

  // Redirect non-admin or unauthorized users if they land on restricted tabs
  useEffect(() => {
    if (currentUser) {
      if (activeTab === 'admin' && currentUser.username !== 'admin') {
        setActiveTab('mobile');
      } else if (activeTab === 'audit' && currentUser.role !== 'admin') {
        setActiveTab('mobile');
      }
    }
  }, [currentUser, activeTab]);

  // Subscribe to Progress Data in real time
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const progressRef = collection(db, 'progress');
    const unsubscribe = onSnapshot(progressRef, (snapshot) => {
      const data: { [groupId: string]: ProgressGroup } = {};
      snapshot.forEach((doc) => {
        data[doc.id] = { id: doc.id, ...doc.data() } as ProgressGroup;
      });

      // Initialize all blocks (0, 100, 200, 300, 400, 500, 600) if not present
      const requiredGroups = ['0', '100', '200', '300', '400', '500', '600'];
      requiredGroups.forEach((gid) => {
        if (!data[gid]) {
          data[gid] = { id: gid, cells: {} };
        }
      });

      setProgressData(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'progress');
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Handle cell toggle atomically (Updates progress and registers Audit Log in a single transaction/batch!)
  const handleToggleCell = async (estaca: number, activityId: string, currentStatus: 'none' | 'executing' | 'completed') => {
    if (!currentUser) return;

    const groupId = (Math.floor(estaca / 100) * 100).toString();
    const cellKey = `${estaca}_${activityId}`;
    
    let nextStatus: 'none' | 'executing' | 'completed' = 'none';
    if (currentStatus === 'none') {
      nextStatus = 'executing';
    } else if (currentStatus === 'executing') {
      nextStatus = 'completed';
    } else {
      nextStatus = 'none';
    }

    const isCompleted = nextStatus === 'completed';
    const timestamp = new Date().toISOString();
    const activityName = ACTIVITIES.find(a => a.id === activityId)?.name || activityId;

    try {
      const batch = writeBatch(db);

      // 1. Update progress document using set with merge to ensure nested keys are merged correctly and safely
      const progressDocRef = doc(db, 'progress', groupId);
      batch.set(progressDocRef, {
        cells: {
          [cellKey]: {
            status: nextStatus,
            completed: isCompleted,
            updatedBy: currentUser.name,
            updatedAt: timestamp
          }
        }
      }, { merge: true });

      // 2. Add log document to audit logs collection
      const logCollectionRef = collection(db, 'audit_logs');
      const newLogDocRef = doc(logCollectionRef);
      batch.set(newLogDocRef, {
        estaca,
        activityId,
        activityName,
        oldValue: currentStatus,
        newValue: nextStatus,
        updatedBy: currentUser.name,
        timestamp
      });

      // 3. Atomically commit the batch
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `progress/${groupId}`);
    }
  };

  // Handle bulk range/interval updates of estacas atomically and chunked for safety
  const handleToggleRange = async (startEstaca: number, endEstaca: number, activityId: string, newValue: 'completed' | 'executing') => {
    if (!currentUser) return;

    const timestamp = new Date().toISOString();
    const activityName = ACTIVITIES.find(a => a.id === activityId)?.name || activityId;

    const minEstaca = Math.min(startEstaca, endEstaca);
    const maxEstaca = Math.max(startEstaca, endEstaca);
    const estacas: number[] = [];
    for (let i = minEstaca; i <= maxEstaca; i++) {
      estacas.push(i);
    }

    try {
      // Process in chunks of 150 to respect Firestore batch limits (150 logs + progress writes)
      const chunkSize = 150;
      for (let i = 0; i < estacas.length; i += chunkSize) {
        const chunk = estacas.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        // Group the updates by groupId
        const progressByGroup: { [groupId: string]: { cells: { [cellKey: string]: any } } } = {};

        chunk.forEach((num) => {
          const groupId = (Math.floor(num / 100) * 100).toString();
          const cellKey = `${num}_${activityId}`;

          if (!progressByGroup[groupId]) {
            progressByGroup[groupId] = { cells: {} };
          }

          const isCompleted = newValue === 'completed';
          progressByGroup[groupId].cells[cellKey] = {
            status: newValue,
            completed: isCompleted,
            updatedBy: currentUser.name,
            updatedAt: timestamp
          };

          // Add log for this estaca update
          const logCollectionRef = collection(db, 'audit_logs');
          const newLogDocRef = doc(logCollectionRef);
          batch.set(newLogDocRef, {
            estaca: num,
            activityId,
            activityName,
            oldValue: 'unknown',
            newValue: newValue,
            updatedBy: currentUser.name,
            timestamp
          });
        });

        // Set accumulated progress updates to the batch using merge: true (only one write per group!)
        Object.keys(progressByGroup).forEach((groupId) => {
          const progressDocRef = doc(db, 'progress', groupId);
          batch.set(progressDocRef, progressByGroup[groupId], { merge: true });
        });

        await batch.commit();
      }
    } catch (err) {
      console.error("Error bulk updating range:", err);
      alert("Erro ao salvar alterações no lote. Tente novamente.");
      throw err;
    }
  };

  const handleLogout = () => {
    if (window.confirm('Deseja realmente sair do sistema?')) {
      setCurrentUser(null);
      setActiveTab('mobile');
    }
  };

  const toggleActivityVisibility = (id: string) => {
    if (visibleActivities.includes(id)) {
      setVisibleActivities(visibleActivities.filter(a => a !== id));
    } else {
      setVisibleActivities([...visibleActivities, id]);
    }
  };

  const selectAllActivities = () => {
    setVisibleActivities(ACTIVITIES.map(a => a.id));
  };

  const selectNoneActivities = () => {
    setVisibleActivities([]);
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-slate-200 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-extrabold text-white shadow-md shadow-blue-500/10">
                C2
              </div>
              <div>
                <span className="text-base font-light tracking-tight text-white block">
                  CDois <span className="font-bold">Oliveira</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 tracking-wider block uppercase -mt-0.5">CE-388 / Altaneira</span>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex space-x-1" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('mobile')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                  activeTab === 'mobile'
                    ? 'bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                }`}
                id="tab-mobile"
              >
                Apontamentos (Mobile)
              </button>
              <button
                onClick={() => setActiveTab('grid')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                  activeTab === 'grid'
                    ? 'bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                }`}
                id="tab-grid"
              >
                Diagrama (Geral)
              </button>
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                    activeTab === 'audit'
                      ? 'bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
                  id="tab-audit"
                >
                  Auditoria
                </button>
              )}
              {currentUser.username === 'admin' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                    activeTab === 'admin'
                      ? 'bg-blue-600/15 border border-blue-500/30 text-blue-400 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
                  id="tab-admin"
                >
                  Usuários
                </button>
              )}
            </nav>

            {/* Top Right Action Controls */}
            <div className="hidden md:flex items-center gap-3">
              {/* Firebase Sinc Indicator */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Sincronizado</span>
              </div>

              {/* PDF Print Button */}
              <PdfExportButton progressData={progressData} />

              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold ${
                  showFilterPanel
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-750 text-slate-400'
                }`}
                id="btn-filter-activities"
              >
                <ListFilter className="h-4 w-4" />
                <span>Atividades ({visibleActivities.length})</span>
              </button>

              <div className="flex items-center gap-2 border-l border-slate-800 pl-4 mr-1">
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-300 leading-none">{currentUser.name}</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">
                    {currentUser.role === 'admin' ? 'Gestor' : 'Apontador'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-red-950/20 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition"
                title="Sair do Sistema"
                id="btn-logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`p-2 rounded-lg border text-slate-400 ${
                  showFilterPanel ? 'bg-blue-500/10 border-blue-400 text-blue-400' : 'bg-slate-900 border-slate-800'
                }`}
                id="btn-filter-mobile"
              >
                <ListFilter className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-white"
                id="btn-menu-mobile"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-3 space-y-2">
            <button
              onClick={() => { setActiveTab('mobile'); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
                activeTab === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              Apontamentos (Mobile)
            </button>
            <button
              onClick={() => { setActiveTab('grid'); setMobileMenuOpen(false); }}
              className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
                activeTab === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              Diagrama (Geral)
            </button>
            {currentUser.role === 'admin' && (
              <button
                onClick={() => { setActiveTab('audit'); setMobileMenuOpen(false); }}
                className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
                  activeTab === 'audit' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Auditoria
              </button>
            )}
            {currentUser.username === 'admin' && (
              <button
                onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold ${
                  activeTab === 'admin' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Usuários
              </button>
            )}
            
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <PdfExportButton progressData={progressData} />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-red-400 hover:bg-red-950/20 border border-slate-800 w-full justify-center"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Visible Activities Selection Drawer (Floating Header Menu) */}
      {showFilterPanel && (
        <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-6 shadow-2xl transition duration-300 font-sans z-40 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Filtrar Atividades do Diagrama</h3>
                <p className="text-xs text-slate-500 mt-1">Marque ou desmarque para personalizar quais atividades aparecem no seu acompanhamento.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllActivities}
                  className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-850 transition"
                >
                  Selecionar Tudo
                </button>
                <button
                  onClick={selectNoneActivities}
                  className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-lg border border-slate-850 transition"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 mt-2">
              {ACTIVITIES.map((act) => {
                const isChecked = visibleActivities.includes(act.id);
                return (
                  <button
                    key={act.id}
                    onClick={() => toggleActivityVisibility(act.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition duration-200 active:scale-95 ${
                      isChecked
                        ? 'bg-slate-950 border-blue-500/30 text-white shadow-md shadow-blue-500/5'
                        : 'bg-slate-950/40 border-slate-850 text-slate-500 hover:border-slate-800 hover:text-slate-400'
                    }`}
                  >
                    <div className="shrink-0">
                      {isChecked ? (
                        <CheckSquare className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-800" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3.5 h-3.5 rounded border border-slate-800 shrink-0" style={{ backgroundColor: act.color }} />
                      <span className="text-xs font-bold truncate">{act.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 bg-[#0F1115]">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mb-4" />
            <h3 className="text-base font-semibold text-slate-400">Carregando dados da rodovia...</h3>
            <p className="text-xs text-slate-600 mt-1">Conectando ao banco de dados em tempo real</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto py-8">
            {activeTab === 'mobile' && (
              <MobileView
                currentUser={currentUser}
                visibleActivities={visibleActivities}
                progressData={progressData}
                onToggleCell={handleToggleCell}
                onToggleRange={handleToggleRange}
              />
            )}

            {activeTab === 'grid' && (
              <GridView
                currentUser={currentUser}
                visibleActivities={visibleActivities}
                progressData={progressData}
                onToggleCell={handleToggleCell}
              />
            )}

            {activeTab === 'audit' && currentUser.role === 'admin' && (
              <AuditLogView />
            )}

            {activeTab === 'admin' && currentUser.username === 'admin' && (
              <AdminPanel />
            )}
          </div>
        )}
      </main>

      {/* Simple Legal Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 text-center">
        <p className="text-[10px] text-slate-600 font-medium">
          CDois Oliveira • Sistema de Acompanhamento de Obras Rodoviárias • 2026
        </p>
      </footer>
    </div>
  );
}
