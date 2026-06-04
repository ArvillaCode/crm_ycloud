import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export function Pipeline({ contacts = [], stages = [], onStageChange }) {
  const [dragOverStageId, setDragOverStageId] = useState(null);

  const handleDragStart = (e, contactId) => {
    e.dataTransfer.setData('text/plain', contactId);
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    setDragOverStageId(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStageId(null);
  };

  const handleDrop = (e, targetStageId) => {
    e.preventDefault();
    setDragOverStageId(null);
    const contactId = e.dataTransfer.getData('text/plain');
    if (contactId && onStageChange) {
      onStageChange(contactId, targetStageId);
    }
  };

  const handleCardClick = (contactId, currentStageId) => {
    // Falls back to advance stage on click if drag-and-drop isn't used
    const nextIndex = stages.findIndex(s => s.id === currentStageId) + 1;
    const nextStage = nextIndex < stages.length ? stages[nextIndex] : stages[0];
    if (nextStage && onStageChange) {
      onStageChange(contactId, nextStage.id);
    }
  };

  return (
    <div className="flex-1 p-8 flex flex-col overflow-hidden">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-200">Embudo Comercial</h2>
        <p className="text-xs text-slate-400">Visualiza la conversión de tus contactos comerciales. Arrastra las tarjetas entre columnas o haz clic en ellas para avanzar en el proceso.</p>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
        {stages.map(stage => {
          const stageContacts = contacts.filter(c => c.pipeline_stage_id === stage.id);
          const isDragOver = dragOverStageId === stage.id;

          return (
            <div 
              key={stage.id} 
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`flex flex-col h-full bg-slate-900/20 border rounded-xl overflow-hidden transition-all duration-200 ${
                isDragOver 
                  ? 'border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/5 scale-[1.01]' 
                  : 'border-slate-800/80'
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-800/60 bg-slate-900/40 flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-300">{stage.name}</span>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">{stageContacts.length}</span>
              </div>

              {/* Column Body Cards list */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {stageContacts.map(c => (
                  <div 
                    key={c.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, c.id)}
                    onClick={() => handleCardClick(c.id, stage.id)}
                    className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-lg hover:border-emerald-500/40 transition cursor-grab active:cursor-grabbing flex flex-col gap-2 group hover:bg-slate-900 select-none"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-200 group-hover:text-emerald-400 transition">{c.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <span className="text-xs text-slate-400 truncate block">{c.company || 'Sin Empresa'}</span>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-1">
                      <span className="text-[10px] font-mono text-slate-500">{c.phone}</span>
                      <span className="text-[10px] text-slate-400">
                        {c.last_message_at 
                          ? (c.last_message_at.includes('T') 
                              ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                              : c.last_message_at) 
                          : 'Ayer'}
                      </span>
                    </div>
                  </div>
                ))}
                {stageContacts.length === 0 && (
                  <div className="h-full flex items-center justify-center py-12 text-center border-2 border-dashed border-slate-800/40 rounded-lg">
                    <p className="text-xs text-slate-600">Suelta leads aquí</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Pipeline;
