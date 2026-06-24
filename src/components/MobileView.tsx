import React, { useState, useEffect } from 'react';
import { User, Activity, ACTIVITIES, ProgressGroup } from '../types';
import { Plus, Minus, Search, CheckCircle, Clock, User as UserIcon, Calendar, Layers, RefreshCw, X } from 'lucide-react';

interface MobileViewProps {
  currentUser: User;
  visibleActivities: string[];
  progressData: { [groupId: string]: ProgressGroup };
  onToggleCell: (
    estaca: number,
    activityId: string,
    nextStatus: 'none' | 'executing' | 'completed',
    currentStatus?: 'none' | 'executing' | 'completed'
  ) => Promise<void>;
  onToggleRange: (startEstaca: number, endEstaca: number, activityId: string, newValue: 'completed' | 'executing') => Promise<void>;
}

export default function MobileView({
  currentUser,
  visibleActivities,
  progressData,
  onToggleCell,
  onToggleRange
}: MobileViewProps) {
  const [estaca, setEstaca] = useState<number>(0);
  const [searchVal, setSearchVal] = useState<string>('0');
  const [savingCellId, setSavingCellId] = useState<string | null>(null);

  // States for bulk interval launcher
  const [rangeStart, setRangeStart] = useState<number>(0);
  const [rangeEnd, setRangeEnd] = useState<number>(0);
  const [rangeActivity, setRangeActivity] = useState<string>(ACTIVITIES[0]?.id || '');
  const [rangeValue, setRangeValue] = useState<'completed' | 'executing'>('completed');
  const [bulkUpdating, setBulkUpdating] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleApplyRange = async () => {
    if (rangeStart < 0 || rangeStart > 649 || rangeEnd < 0 || rangeEnd > 649) {
      alert('As estacas devem estar entre 0 e 649.');
      return;
    }
    const actName = ACTIVITIES.find(a => a.id === rangeActivity)?.name || rangeActivity;
    const statusStr = rangeValue === 'completed' ? 'Concluído' : 'Em execução';
    const confirmMessage = `Deseja realmente alterar o status para "${statusStr}" de todas as estacas no intervalo de ${rangeStart} a ${rangeEnd} para a atividade "${actName}"?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setBulkUpdating(true);
    setSuccessMsg(null);
    try {
      await onToggleRange(rangeStart, rangeEnd, rangeActivity, rangeValue);
      setSuccessMsg(`O intervalo de estacas ${rangeStart} a ${rangeEnd} foi atualizado com sucesso para "${statusStr}" na atividade "${actName}"!`);
      // Auto-clear message after 8 seconds
      setTimeout(() => {
        setSuccessMsg(current => current && current.includes(`${rangeStart} a ${rangeEnd}`) ? null : current);
      }, 8000);
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar as estacas do intervalo.');
    } finally {
      setBulkUpdating(false);
    }
  };

  // Sync typed search value with current estaca number
  useEffect(() => {
    setSearchVal(estaca.toString());
  }, [estaca]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0 && num <= 649) {
      setEstaca(num);
    }
  };

  const handleIncrement = () => {
    if (estaca < 649) {
      setEstaca(estaca + 1);
    }
  };

  const handleDecrement = () => {
    if (estaca > 0) {
      setEstaca(estaca - 1);
    }
  };

  const handleToggle = async (activityId: string, nextStatus: 'none' | 'executing' | 'completed', currentStatus: 'none' | 'executing' | 'completed') => {
    const cellId = `${estaca}_${activityId}`;
    setSavingCellId(cellId);
    try {
      await onToggleCell(estaca, activityId, nextStatus, currentStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingCellId(null);
    }
  };

  // Extract cell status for current estaca
  const getCellStatus = (activityId: string) => {
    const groupId = (Math.floor(estaca / 100) * 100).toString();
    const group = progressData[groupId];
    const cellKey = `${estaca}_${activityId}`;
    const cell = group?.cells?.[cellKey];
    
    let statusVal: 'none' | 'executing' | 'completed' = 'none';
    if (cell) {
      if (cell.status) {
        statusVal = cell.status;
      } else if (cell.completed) {
        statusVal = 'completed';
      }
    }

    return {
      status: statusVal,
      completed: statusVal === 'completed',
      updatedBy: cell?.updatedBy || '',
      updatedAt: cell?.updatedAt || ''
    };
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 font-sans">
      {/* Header Info */}
      <div className="bg-slate-900/30 rounded-2xl p-5 shadow-2xl border border-slate-800/80 backdrop-blur-md mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Operador Logado</h3>
            <p className="text-lg font-extrabold text-white">{currentUser.name}</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {currentUser.role === 'admin' ? 'Gerente' : 'Apontador'}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Insira abaixo as estacas concluídas em campo. O salvamento é automático e sincroniza em tempo real.
        </p>
      </div>

      {/* Estaca Selector */}
      <div className="bg-slate-900/30 rounded-2xl p-6 shadow-2xl border border-slate-800/80 backdrop-blur-md mb-6">
        <h3 className="text-center text-sm font-semibold text-slate-500 mb-4">SELECIONAR ESTACA (0 a 649)</h3>
        
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handleDecrement}
            disabled={estaca <= 0}
            className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800 text-slate-200 border border-slate-750 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95 shadow-lg shadow-black/30"
            id="btn-decrement-estaca"
          >
            <Minus className="h-6 w-6" />
          </button>

          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-blue-500/40" />
            </div>
            <input
              type="number"
              min="0"
              max="649"
              value={searchVal}
              onChange={handleSearchChange}
              className="block w-full text-center pl-10 pr-4 py-3.5 bg-slate-950 border-2 border-slate-850 focus:border-blue-500/40 text-2xl font-black text-white rounded-2xl focus:outline-none transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#0F1115] px-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest">
              Estaca Nº
            </span>
          </div>

          <button
            onClick={handleIncrement}
            disabled={estaca >= 649}
            className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800 text-slate-200 border border-slate-750 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95 shadow-lg shadow-black/30"
            id="btn-increment-estaca"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Lançamento em Lote / Intervalo de Estacas */}
      <div className="bg-slate-900/30 rounded-2xl p-6 shadow-2xl border border-slate-800/80 backdrop-blur-md mb-6">
        <div className="flex items-center gap-2 mb-3.5 border-b border-slate-800 pb-3">
          <Layers className="h-5 w-5 text-blue-500" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lançamento em Lote (Intervalo)</h3>
        </div>

        <div className="space-y-4">
          {successMsg && (
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-start gap-2.5 relative shadow-lg shadow-emerald-500/5 animate-fadeIn">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5 animate-bounce" />
              <div className="flex-1 pr-5 leading-normal">
                {successMsg}
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
                className="absolute top-3 right-3 text-emerald-500/60 hover:text-emerald-400 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">Estaca Inicial</label>
              <input
                type="number"
                min="0"
                max="649"
                value={rangeStart}
                onChange={(e) => setRangeStart(Math.max(0, Math.min(649, parseInt(e.target.value) || 0)))}
                className="block w-full text-center py-2 bg-slate-950 border border-slate-850 focus:border-blue-500/40 text-base font-bold text-white rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">Estaca Final</label>
              <input
                type="number"
                min="0"
                max="649"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(Math.max(0, Math.min(649, parseInt(e.target.value) || 0)))}
                className="block w-full text-center py-2 bg-slate-950 border border-slate-850 focus:border-blue-500/40 text-base font-bold text-white rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">Atividade</label>
            <select
              value={rangeActivity}
              onChange={(e) => setRangeActivity(e.target.value)}
              className="block w-full px-3 py-2 bg-slate-950 border border-slate-850 focus:border-blue-500/40 text-xs font-bold text-slate-300 rounded-xl focus:outline-none"
            >
              {ACTIVITIES.map((act) => (
                <option key={act.id} value={act.id} className="bg-slate-950 text-slate-300 font-bold">
                  {act.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">Novo Status</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-850">
              <button
                type="button"
                onClick={() => setRangeValue('completed')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  rangeValue === 'completed'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Concluído
              </button>
              <button
                type="button"
                onClick={() => setRangeValue('executing')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  rangeValue === 'executing'
                    ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/10'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Em execução
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyRange}
            disabled={bulkUpdating}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:from-blue-500 hover:to-indigo-500 transition active:scale-[0.98] disabled:opacity-50"
          >
            {bulkUpdating ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Aplicando no lote...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>Aplicar no Intervalo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Activities Quick Toggle List */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
          Atividades da Estaca {estaca}
        </h3>

        {ACTIVITIES.filter(act => visibleActivities.includes(act.id)).map(act => {
          const status = getCellStatus(act.id);
          const cellState = status.status; // 'none' | 'executing' | 'completed'
          const isSaving = savingCellId === `${estaca}_${act.id}`;

          return (
            <div
              key={act.id}
              className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                cellState === 'completed'
                  ? 'bg-[#0f1d15]/40 border-emerald-800/30 shadow-md shadow-emerald-500/2'
                  : cellState === 'executing'
                    ? 'bg-[#1f170f]/40 border-amber-800/30 shadow-md shadow-amber-500/2'
                    : 'bg-slate-900/10 border-slate-850 shadow-md'
              }`}
            >
              {/* Colored left indicator strip */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2.5 transition-all"
                style={{ backgroundColor: cellState === 'completed' ? act.color : cellState === 'executing' ? '#d97706' : '#1e293b' }}
              />

              <div className="p-4 pl-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white truncate">{act.name}</p>
                  
                  {cellState === 'completed' ? (
                    <div className="mt-1 flex flex-col gap-0.5">
                      <div className="flex items-center text-xs text-emerald-400 font-semibold">
                        <CheckCircle className="h-3 w-3 mr-1 text-emerald-500" />
                        Concluído
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                        <span className="flex items-center">
                          <UserIcon className="h-2.5 w-2.5 mr-0.5" />
                          {status.updatedBy}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          {formatDateTime(status.updatedAt)}
                        </span>
                      </div>
                    </div>
                  ) : cellState === 'executing' ? (
                    <div className="mt-1 flex flex-col gap-0.5">
                      <div className="flex items-center text-xs text-amber-400 font-semibold">
                        <Clock className="h-3 w-3 mr-1 text-amber-500" />
                        Em execução
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                        <span className="flex items-center">
                          <UserIcon className="h-2.5 w-2.5 mr-0.5" />
                          {status.updatedBy}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          {formatDateTime(status.updatedAt)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-xs text-slate-600 font-medium">Não executado</p>
                  )}
                </div>

                {/* Status selector segment */}
                <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleToggle(act.id, 'none', cellState)}
                    disabled={isSaving}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                      cellState === 'none'
                        ? 'bg-slate-800 text-slate-250'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(act.id, 'executing', cellState)}
                    disabled={isSaving}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                      cellState === 'executing'
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/10'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Em Exec.
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(act.id, 'completed', cellState)}
                    disabled={isSaving}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                      cellState === 'completed'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/10'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Concluir
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {visibleActivities.length === 0 && (
          <div className="text-center py-8 px-4 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
            <p className="text-sm text-slate-500 font-bold">Nenhuma atividade selecionada para exibição.</p>
            <p className="text-xs text-slate-600 mt-1">Use a barra superior para ativar as atividades.</p>
          </div>
        )}
      </div>
    </div>
  );
}
