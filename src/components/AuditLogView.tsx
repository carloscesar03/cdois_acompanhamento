import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { AuditLog } from '../types';
import { Calendar, User as UserIcon, Search, Layers, RefreshCw, FileText } from 'lucide-react';

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to audit logs collection (limited to last 150 items for real-time efficiency)
    const logsRef = collection(db, 'audit_logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(150));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsList: AuditLog[] = [];
      snapshot.forEach((doc) => {
        logsList.push({ id: doc.id, ...doc.data() } as AuditLog);
      });
      setLogs(logsList);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'audit_logs');
    });

    return () => unsubscribe();
  }, []);

  const formatDateTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log => {
    const text = filterText.toLowerCase();
    return (
      log.updatedBy.toLowerCase().includes(text) ||
      log.estaca.toString().includes(text) ||
      log.activityName.toLowerCase().includes(text)
    );
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 font-sans">
      <div className="bg-slate-900/30 border border-slate-800/80 backdrop-blur-md rounded-2xl shadow-2xl p-6">
        {/* Title / Description */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
          <div>
            <h2 className="text-xl font-light text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Histórico de <span className="font-bold">Auditoria</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Rastreabilidade completa de todas as alterações feitas na planilha em tempo real.
            </p>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-800 shrink-0 self-start sm:self-center">
            {filteredLogs.length} registros exibidos
          </div>
        </div>

        {/* Filters */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Filtrar por estaca, atividade ou operador..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="block w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-sm"
          />
        </div>

        {/* Logs Timeline */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
            <span className="text-sm text-slate-500">Carregando auditoria...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-sm text-slate-500">Nenhum registro de alteração encontrado.</p>
          </div>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8">
              {filteredLogs.map((log, logIdx) => (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {logIdx !== filteredLogs.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-800" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-[#0F1115] ${
                          log.newValue === 'executing'
                            ? 'bg-amber-500/10 text-amber-400'
                            : (log.newValue === 'completed' || log.newValue === true)
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                        }`}>
                          <Layers className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pt-1.5 flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                        <div>
                          <p className="text-sm text-white font-semibold">
                            Estaca <span className="text-blue-400 font-extrabold">{log.estaca}</span> —{' '}
                            <span className="text-slate-300">{log.activityName}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-4">
                            <span className="inline-flex items-center text-slate-400 font-medium">
                              <UserIcon className="h-3 w-3 mr-1 text-slate-600" />
                              {log.updatedBy}
                            </span>
                            <span className="inline-flex items-center text-slate-500">
                              <Calendar className="h-3 w-3 mr-1 text-slate-600" />
                              {formatDateTime(log.timestamp)}
                            </span>
                          </p>
                        </div>
                        <div className="self-start md:self-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            log.newValue === 'executing'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : (log.newValue === 'completed' || log.newValue === true)
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-950/20 text-red-400 border-red-500/20'
                          }`}>
                            {log.newValue === 'executing' ? 'Em execução' : (log.newValue === 'completed' || log.newValue === true) ? 'Concluída' : 'Limpada'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
