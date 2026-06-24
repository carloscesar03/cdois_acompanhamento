import React from 'react';
import { User, Activity, ACTIVITIES, ProgressGroup } from '../types';
import { HelpCircle, User as UserIcon, Calendar, CheckCircle, Clock } from 'lucide-react';

interface GridViewProps {
  currentUser: User;
  visibleActivities: string[];
  progressData: { [groupId: string]: ProgressGroup };
  onToggleCell: (estaca: number, activityId: string, currentStatus: 'none' | 'executing' | 'completed') => Promise<void>;
}

export default function GridView({
  currentUser,
  visibleActivities,
  progressData,
  onToggleCell
}: GridViewProps) {
  // Define the blocks exactly like the Excel layout
  const blocks = [
    { start: 0, end: 100, label: 'Estacas 0 - 100' },
    { start: 101, end: 200, label: 'Estacas 101 - 200' },
    { start: 201, end: 300, label: 'Estacas 201 - 300' },
    { start: 301, end: 400, label: 'Estacas 301 - 400' },
    { start: 401, end: 500, label: 'Estacas 401 - 500' },
    { start: 501, end: 600, label: 'Estacas 501 - 600' },
    { start: 601, end: 649, label: 'Estacas 601 - 649' }
  ];

  // Activities list in REVERSE order (3º Banho on top, Terraplenagem on bottom) to match Excel layout exactly
  const orderedActivities = [...ACTIVITIES].reverse();

  // Helper to extract progress details for a specific cell
  const getCellStatus = (estaca: number, activityId: string) => {
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

  const handleCellClick = async (estaca: number, activityId: string) => {
    const statusInfo = getCellStatus(estaca, activityId);
    try {
      await onToggleCell(estaca, activityId, statusInfo.status);
    } catch (err) {
      console.error('Error toggling grid cell', err);
    }
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
    <div className="w-full space-y-12 pb-12 font-sans px-4">
      {/* Visual Instruction Banner */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex items-start gap-3">
        <HelpCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-400">
          <p className="font-semibold text-white">Visualização de Diagrama (Estilo Excel)</p>
          <p className="text-xs text-slate-500 mt-1">
            Cada quadrado representa uma estaca. Clique em qualquer quadrado para preencher ou limpar. Passe o mouse para ver detalhes de quem concluiu e quando.
          </p>
        </div>
      </div>

      {/* Render each block of 100 estacas */}
      {blocks.map((block) => {
        // Generate array of numbers for columns
        const estacasRange: number[] = [];
        for (let i = block.start; i <= block.end; i++) {
          estacasRange.push(i);
        }

        return (
          <div key={block.start} className="bg-slate-900/20 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
            {/* Block Header */}
            <div className="bg-slate-900/40 px-6 py-4 border-b border-slate-800/60 flex justify-between items-center">
              <h3 className="text-base font-bold text-blue-400 tracking-wide uppercase">
                {block.label}
              </h3>
              <span className="text-xs font-semibold text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-800">
                {estacasRange.length} estacas
              </span>
            </div>

            {/* Scrollable grid container */}
            <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
              <div className="min-w-max p-4">
                <table className="border-collapse table-fixed">
                  <thead>
                    <tr>
                      {/* Left header corner for Activity names */}
                      <th className="w-48 text-left text-xs font-bold text-slate-400 sticky left-0 bg-[#13171f] z-10 pr-4 pl-2 py-1.5 border-b border-slate-800">
                        Atividade / Estaca
                      </th>
                      {/* Header columns with estaca numbers */}
                      {estacasRange.map((estacaNum) => (
                        <th
                          key={estacaNum}
                          className="w-10 text-center text-[10px] font-mono text-slate-500 border border-slate-800/60 bg-slate-950/60 py-1.5 select-none"
                        >
                          {estacaNum}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Render rows in reverse order (top to bottom as required) */}
                    {orderedActivities
                      .filter((act) => visibleActivities.includes(act.id))
                      .map((act) => (
                        <tr key={act.id} className="hover:bg-slate-900/20 transition-colors">
                          {/* Row label */}
                          <td className="sticky left-0 bg-[#13171f] z-10 text-xs font-medium text-slate-300 pr-4 pl-2 py-2 border-r border-slate-800 truncate w-48 shadow-[5px_0_10px_-5px_rgba(0,0,0,0.5)]">
                            {act.name}
                          </td>
                          {/* Cell values */}
                          {estacasRange.map((estacaNum) => {
                            const status = getCellStatus(estacaNum, act.id);
                            const cellState = status.status; // 'none' | 'executing' | 'completed'

                            return (
                              <td
                                key={`${estacaNum}_${act.id}`}
                                onClick={() => handleCellClick(estacaNum, act.id)}
                                className="border border-slate-800/60 w-10 h-10 p-0.5 relative group cursor-pointer transition active:scale-95"
                                title={`Estaca ${estacaNum} - ${act.name}\n${
                                  cellState === 'completed'
                                    ? `Concluído por: ${status.updatedBy}\nData: ${formatDateTime(status.updatedAt)}`
                                    : cellState === 'executing'
                                      ? `Em execução por: ${status.updatedBy}\nData: ${formatDateTime(status.updatedAt)}`
                                      : 'Não executado'
                                }`}
                              >
                                {/* Colored Box */}
                                <div
                                  className="w-full h-full rounded transition-all duration-300 relative overflow-hidden"
                                  style={{
                                    backgroundColor: cellState === 'completed' ? act.color : cellState === 'executing' ? `${act.color}33` : 'transparent',
                                    backgroundImage: cellState === 'executing' ? `repeating-linear-gradient(45deg, ${act.color}44, ${act.color}44 4px, transparent 4px, transparent 8px)` : 'none',
                                    border: cellState === 'completed' ? 'none' : cellState === 'executing' ? `1px dashed ${act.color}` : '1px solid #1E293B',
                                    opacity: cellState === 'none' ? 0.25 : 1
                                  }}
                                >
                                  {cellState === 'completed' && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 text-white font-bold text-[9px] transition-opacity">
                                      ✓
                                    </div>
                                  )}
                                  {cellState === 'executing' && (
                                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[10px] opacity-40">
                                      …
                                    </div>
                                  )}
                                </div>

                                {/* Custom Rich Tooltip on Hover */}
                                <div className="absolute hidden group-hover:block bottom-12 left-1/2 -translate-x-1/2 w-56 p-3 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-20 text-xs text-white pointer-events-none font-sans shadow-blue-500/5">
                                  <div className="font-bold text-blue-400 mb-1">
                                    Estaca {estacaNum}
                                  </div>
                                  <div className="font-semibold text-slate-200 mb-2 truncate">
                                    {act.name}
                                  </div>
                                  {cellState === 'completed' ? (
                                    <div className="space-y-1 text-[11px] text-slate-400">
                                      <div className="flex items-center text-emerald-400 font-bold uppercase tracking-wider text-[9px]">
                                        <CheckCircle className="h-3 w-3 mr-1 shrink-0 text-emerald-500" />
                                        Concluído
                                      </div>
                                      <div className="flex items-center gap-1.5 truncate">
                                        <UserIcon className="h-3 w-3 shrink-0 text-slate-500" />
                                        <span>Por: {status.updatedBy}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3 shrink-0 text-slate-500" />
                                        <span>{formatDateTime(status.updatedAt)}</span>
                                      </div>
                                    </div>
                                  ) : cellState === 'executing' ? (
                                    <div className="space-y-1 text-[11px] text-slate-400">
                                      <div className="flex items-center text-amber-400 font-bold uppercase tracking-wider text-[9px]">
                                        <Clock className="h-3 w-3 mr-1 shrink-0 text-amber-500" />
                                        Em execução
                                      </div>
                                      <div className="flex items-center gap-1.5 truncate">
                                        <UserIcon className="h-3 w-3 shrink-0 text-slate-500" />
                                        <span>Por: {status.updatedBy}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3 w-3 shrink-0 text-slate-500" />
                                        <span>{formatDateTime(status.updatedAt)}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-slate-500 italic">
                                      Não executado
                                    </div>
                                  )}
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
          </div>
        );
      })}

      {visibleActivities.length === 0 && (
        <div className="text-center py-16 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
          <p className="text-base text-slate-500 font-bold">Nenhuma atividade selecionada.</p>
          <p className="text-sm text-slate-600 mt-1">Use a barra de ferramentas acima para marcar as atividades que deseja visualizar.</p>
        </div>
      )}
    </div>
  );
}
