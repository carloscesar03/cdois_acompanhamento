import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ProgressGroup, ACTIVITIES } from '../types';
import { FileDown, Printer, RefreshCw } from 'lucide-react';

interface PdfExportButtonProps {
  progressData: { [groupId: string]: ProgressGroup };
}

export default function PdfExportButton({ progressData }: PdfExportButtonProps) {
  const [generating, setGenerating] = useState(false);

  // Split into 7 blocks exactly like the Excel layout
  const blocks = [
    { start: 0, end: 100 },
    { start: 101, end: 200 },
    { start: 201, end: 300 },
    { start: 301, end: 400 },
    { start: 401, end: 500 },
    { start: 501, end: 600 },
    { start: 601, end: 649 }
  ];

  const orderedActivities = [...ACTIVITIES].reverse();

  const getCellStatus = (estaca: number, activityId: string) => {
    const groupId = (Math.floor(estaca / 100) * 100).toString();
    const group = progressData[groupId];
    const cellKey = `${estaca}_${activityId}`;
    return group?.cells?.[cellKey] || { completed: false };
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // We'll capture the container of the print sheets page by page.
      // To do this reliably, we'll temporarily display a hidden container in the DOM,
      // capture it, and then clean up.
      const printContainer = document.getElementById('pdf-print-container');
      if (!printContainer) {
        throw new Error('Print container not found');
      }

      // Display print container
      printContainer.style.display = 'block';

      // Page 1: Blocks 0-100, 101-200, 201-300, 301-400, 401-500
      const page1Element = document.getElementById('print-page-1');
      if (page1Element) {
        const canvas1 = await html2canvas(page1Element, {
          scale: 2, // High resolution
          useCORS: true,
          backgroundColor: '#FFFFFF'
        });
        const imgData1 = canvas1.toDataURL('image/png');
        doc.addImage(imgData1, 'PNG', 5, 5, 287, 200); // landscape A4 is 297mm x 210mm
      }

      // Page 2: Blocks 501-600, 601-649
      const page2Element = document.getElementById('print-page-2');
      if (page2Element) {
        doc.addPage();
        const canvas2 = await html2canvas(page2Element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#FFFFFF'
        });
        const imgData2 = canvas2.toDataURL('image/png');
        doc.addImage(imgData2, 'PNG', 5, 5, 287, 200);
      }

      // Hide print container again
      printContainer.style.display = 'none';

      // Download the PDF
      doc.save('Acompanhamento_Obra_CDois_Oliveira.pdf');
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {/* Visual Action Button */}
      <button
        onClick={handleGeneratePdf}
        disabled={generating}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-sm hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/10 transition active:scale-95 disabled:opacity-50"
      >
        {generating ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Gerando PDF...</span>
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4" />
            <span>Exportar Diagrama (PDF)</span>
          </>
        )}
      </button>

      <style>{`
        .pdf-print-bg-white { background-color: #ffffff !important; }
        .pdf-print-bg-blue { background-color: #2563eb !important; }
        .pdf-print-bg-slate-50 { background-color: #f8fafc !important; }
        .pdf-print-bg-slate-100 { background-color: #f1f5f9 !important; }
        .pdf-print-border-slate-200 { border: 1px solid #e2e8f0 !important; }
        .pdf-print-border-slate-300 { border: 1px solid #cbd5e1 !important; }
        .pdf-print-border-b-slate-300 { border-bottom: 2px solid #cbd5e1 !important; }
        .pdf-print-text-black { color: #000000 !important; }
        .pdf-print-text-white { color: #ffffff !important; }
        .pdf-print-text-slate-500 { color: #64748b !important; }
        .pdf-print-text-slate-600 { color: #475569 !important; }
        .pdf-print-text-slate-700 { color: #334155 !important; }
        .pdf-print-text-slate-800 { color: #1e293b !important; }
        .pdf-print-text-blue-600 { color: #2563eb !important; }
      `}</style>

      {/* Hidden container that renders beautiful white sheets exactly like the Excel layout */}
      <div
        id="pdf-print-container"
        className="font-sans pdf-print-text-black pdf-print-bg-white"
        style={{
          display: 'none',
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '1120px' // High resolution fixed width to ensure grid fits on landscape page cleanly
        }}
      >
        {/* PAGE 1 */}
        <div id="print-page-1" className="p-8 pdf-print-bg-white" style={{ width: '1120px', minHeight: '792px' }}>
          {/* Sheet Header */}
          <div className="flex justify-between items-center pdf-print-border-b-slate-300 pb-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg pdf-print-bg-blue flex items-center justify-center font-black pdf-print-text-white text-xl">
                C2
              </div>
              <div>
                <h1 className="text-xl font-extrabold pdf-print-text-slate-800 tracking-tight leading-none">
                  CDois Oliveira
                </h1>
                <p className="text-[10px] font-bold pdf-print-text-blue-600 tracking-widest mt-0.5">
                  RODOVIA CE-388 / ALTANEIRA - NOVA OLINDA
                </p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xs font-black pdf-print-text-slate-700 uppercase">
                ACOMPANHAMENTO DE TERRAPLENAGEM, REGULARIZAÇÃO, SUB BASE E BASE
              </h2>
              <p className="text-[9px] pdf-print-text-slate-500 font-bold mt-0.5">
                PÁGINA 1 DE 2 • DIAGRAMA DE PROGRESSO ESTACAS 0 A 500
              </p>
            </div>
          </div>

          {/* Render first 5 blocks */}
          <div className="space-y-5">
            {blocks.slice(0, 5).map((block) => {
              const estacasRange: number[] = [];
              for (let i = block.start; i <= block.end; i++) {
                estacasRange.push(i);
              }

              return (
                <div key={block.start} className="border rounded overflow-hidden pdf-print-border-slate-300">
                  <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr className="pdf-print-bg-slate-100">
                        <th className="w-40 px-2 py-1 text-[9px] font-extrabold pdf-print-text-slate-600 border pdf-print-border-slate-300">
                          Estaca
                        </th>
                        {estacasRange.map((num) => (
                          <th
                            key={num}
                            className="text-center font-black text-[7px] pdf-print-text-slate-700 border pdf-print-border-slate-300 pdf-print-bg-slate-50"
                            style={{ width: '9px', padding: '1px 0' }}
                          >
                            {num}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orderedActivities.map((act) => (
                        <tr key={act.id}>
                          <td className="px-2 py-0.5 text-[8px] font-bold pdf-print-text-slate-800 border pdf-print-border-slate-300 truncate pdf-print-bg-white">
                            {act.name}
                          </td>
                          {estacasRange.map((num) => {
                            const isCompleted = getCellStatus(num, act.id).completed;
                            return (
                              <td
                                key={`${num}_${act.id}`}
                                className="border pdf-print-border-slate-200"
                                style={{
                                  backgroundColor: isCompleted ? act.color : '#FFFFFF',
                                  height: '11px',
                                  padding: 0
                                }}
                              />
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>

        {/* PAGE 2 */}
        <div id="print-page-2" className="p-8 pdf-print-bg-white" style={{ width: '1120px', minHeight: '792px' }}>
          {/* Sheet Header */}
          <div className="flex justify-between items-center pdf-print-border-b-slate-300 pb-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg pdf-print-bg-blue flex items-center justify-center font-black pdf-print-text-white text-xl">
                C2
              </div>
              <div>
                <h1 className="text-xl font-extrabold pdf-print-text-slate-800 tracking-tight leading-none">
                  CDois Oliveira
                </h1>
                <p className="text-[10px] font-bold pdf-print-text-blue-600 tracking-widest mt-0.5">
                  RODOVIA CE-388 / ALTANEIRA - NOVA OLINDA
                </p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xs font-black pdf-print-text-slate-700 uppercase">
                ACOMPANHAMENTO DE TERRAPLENAGEM, REGULARIZAÇÃO, SUB BASE E BASE
              </h2>
              <p className="text-[9px] pdf-print-text-slate-500 font-bold mt-0.5">
                PÁGINA 2 DE 2 • DIAGRAMA DE PROGRESSO ESTACAS 501 A 649
              </p>
            </div>
          </div>

          {/* Render last 2 blocks */}
          <div className="space-y-6">
            {blocks.slice(5).map((block) => {
              const estacasRange: number[] = [];
              for (let i = block.start; i <= block.end; i++) {
                estacasRange.push(i);
              }

              return (
                <div key={block.start} className="border rounded overflow-hidden pdf-print-border-slate-300">
                  <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr className="pdf-print-bg-slate-100">
                        <th className="w-40 px-2 py-1 text-[9px] font-extrabold pdf-print-text-slate-600 border pdf-print-border-slate-300">
                          Estaca
                        </th>
                        {estacasRange.map((num) => (
                          <th
                            key={num}
                            className="text-center font-black text-[7px] pdf-print-text-slate-700 border pdf-print-border-slate-300 pdf-print-bg-slate-50"
                            style={{ width: '9px', padding: '1px 0' }}
                          >
                            {num}
                          </th>
                        ))}
                        {/* Fill remaining empty spaces in page to make layout beautiful */}
                        {block.end === 649 &&
                          Array.from({ length: 51 }).map((_, i) => (
                            <th
                              key={`empty-${i}`}
                              className="border pdf-print-border-slate-200 pdf-print-bg-slate-100"
                              style={{ width: '9px' }}
                            />
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orderedActivities.map((act) => (
                        <tr key={act.id}>
                          <td className="px-2 py-0.5 text-[8px] font-bold pdf-print-text-slate-800 border pdf-print-border-slate-300 truncate pdf-print-bg-white">
                            {act.name}
                          </td>
                          {estacasRange.map((num) => {
                            const isCompleted = getCellStatus(num, act.id).completed;
                            return (
                              <td
                                key={`${num}_${act.id}`}
                                className="border pdf-print-border-slate-200"
                                style={{
                                  backgroundColor: isCompleted ? act.color : '#FFFFFF',
                                  height: '11px',
                                  padding: 0
                                }}
                              />
                            );
                          })}
                          {/* Empty spacer cells */}
                          {block.end === 649 &&
                            Array.from({ length: 51 }).map((_, i) => (
                              <td
                                key={`empty-td-${i}`}
                                className="border pdf-print-border-slate-200 pdf-print-bg-slate-50"
                                style={{ height: '11px' }}
                              />
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* Legenda do Diagrama */}
          <div className="mt-12 p-4 border rounded pdf-print-border-slate-300 pdf-print-bg-slate-50">
            <h3 className="text-xs font-black pdf-print-text-slate-700 uppercase mb-3">
              LEGENDA DE ATIVIDADES
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {ACTIVITIES.map((act) => (
                <div key={act.id} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded border pdf-print-border-slate-300" style={{ backgroundColor: act.color }} />
                  <span className="text-[10px] font-bold pdf-print-text-slate-700">{act.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
