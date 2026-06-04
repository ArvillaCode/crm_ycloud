import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Plus, 
  MessageSquare, 
  FileText, 
  Edit2, 
  X,
  Check
} from 'lucide-react';
import crmService from '../services/crmService';

export function Pipeline({ 
  contacts = [], 
  stages = [], 
  onStageChange,
  onStartConversation,
  onCreateContact,
  onUpdateContact
}) {
  const [dragOverStageId, setDragOverStageId] = useState(null);
  
  // Note Modal state
  const [noteContactId, setNoteContactId] = useState(null);
  const [noteText, setNoteText] = useState('');
  
  // Contact Modal state (for create/edit inside pipeline)
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    notes: '',
    pipelineStageId: '',
    tagIds: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [availableTags, setAvailableTags] = useState([]);

  // Fetch tags for contact modal
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await crmService.getTags();
        setAvailableTags(tags);
      } catch (err) {
        console.error('[Pipeline] Failed to load tags:', err);
      }
    };
    if (contactModalOpen) fetchTags();
  }, [contactModalOpen]);

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
      onStageChange(contactId, targetStageId === 'unassigned' ? null : targetStageId);
    }
  };

  const handleCardClick = (contactId, currentStageId) => {
    const cleanCurrentStageId = currentStageId === 'unassigned' ? null : currentStageId;
    const currentIndex = stages.findIndex(s => s.id === cleanCurrentStageId);
    
    // Looping stages: unassigned -> stages[0] -> stages[1] -> ... -> unassigned
    let nextStageId = null;
    if (cleanCurrentStageId === null && stages.length > 0) {
      nextStageId = stages[0].id;
    } else if (currentIndex !== -1 && currentIndex + 1 < stages.length) {
      nextStageId = stages[currentIndex + 1].id;
    } else {
      nextStageId = null;
    }

    if (onStageChange) {
      onStageChange(contactId, nextStageId);
    }
  };

  // Open Create Contact Modal
  const openCreateModal = (stageId) => {
    setEditingContact(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      company: '',
      notes: '',
      pipelineStageId: stageId === 'unassigned' ? '' : (stageId || ''),
      tagIds: []
    });
    setFormErrors({});
    setContactModalOpen(true);
  };

  // Open Edit Contact Modal
  const openEditModal = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      company: contact.company || '',
      notes: contact.notes || '',
      pipelineStageId: contact.pipeline_stage_id || '',
      tagIds: (contact.tags || []).map(t => t.id)
    });
    setFormErrors({});
    setContactModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres.';
    }
    const phonePattern = /^\+?[1-9]\d{1,14}$/;
    if (!formData.phone || !phonePattern.test(formData.phone.replace(/\s+/g, ''))) {
      errors.phone = 'Teléfono inválido. Incluye código de país (ej: +525512345678).';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const sanitizedData = {
      ...formData,
      phone: formData.phone.replace(/\s+/g, ''),
      pipelineStageId: formData.pipelineStageId === '' ? null : formData.pipelineStageId,
    };

    try {
      if (editingContact) {
        await onUpdateContact(editingContact.id, sanitizedData);
      } else {
        await onCreateContact(sanitizedData);
      }
      setContactModalOpen(false);
    } catch (err) {
      console.error('[Pipeline] Error saving contact:', err);
      setFormErrors({ submit: err.response?.data?.error || 'Error al guardar el contacto.' });
    }
  };

  // Open Note Modal
  const openNoteModal = (contactId) => {
    setNoteContactId(contactId);
    setNoteText('');
  };

  // Submit Note
  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !noteContactId) return;

    try {
      const conv = await crmService.createConversation(noteContactId);
      await crmService.sendMessage(conv.id, noteText.trim(), 'text', true);
      setNoteContactId(null);
      setNoteText('');
      alert('Nota interna guardada con éxito.');
    } catch (err) {
      console.error('[Pipeline] Error saving note:', err);
      alert('Error al guardar la nota.');
    }
  };

  // Append virtual "Sin Etapa" column
  const allStages = [
    { id: 'unassigned', name: 'Sin Etapa', isVirtual: true },
    ...stages
  ];

  return (
    <div className="flex-1 p-8 flex flex-col overflow-hidden">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-200">Embudo Comercial</h2>
        <p className="text-xs text-slate-400 font-sans">
          Organiza tus contactos comerciales. Arrastra las tarjetas para moverlas de etapa, o haz clic en ellas para avanzar rápido.
        </p>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 scrollbar-thin">
        {allStages.map(stage => {
          // Filter contacts belonging to this stage
          const stageContacts = stage.isVirtual
            ? contacts.filter(c => !c.pipeline_stage_id)
            : contacts.filter(c => c.pipeline_stage_id === stage.id);
          
          const isDragOver = dragOverStageId === stage.id;

          return (
            <div 
              key={stage.id} 
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`w-72 flex flex-col h-full bg-slate-900/20 border rounded-xl shrink-0 overflow-hidden transition-all duration-200 ${
                isDragOver 
                  ? 'border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/5 scale-[1.01]' 
                  : 'border-slate-800/80'
              }`}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-800/60 bg-slate-900/40 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-300">{stage.name}</span>
                  <span className="text-[9px] text-slate-500 font-medium">Leads: {stageContacts.length}</span>
                </div>
                <button
                  onClick={() => openCreateModal(stage.id)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition"
                  title="Nuevo contacto en esta etapa"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Column Body Cards List */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {stageContacts.map(c => (
                  <div 
                    key={c.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, c.id)}
                    onClick={() => handleCardClick(c.id, stage.id)}
                    className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-lg hover:border-emerald-500/40 transition cursor-grab active:cursor-grabbing flex flex-col gap-2 group hover:bg-slate-900 select-none"
                  >
                    {/* Tags List */}
                    <div className="flex gap-1 flex-wrap">
                      {(c.tags || []).map(t => (
                        <span 
                          key={t.id} 
                          className="text-[8px] px-1.5 py-0.2 rounded border font-medium shrink-0"
                          style={{ backgroundColor: t.color + '15', borderColor: t.color + '30', color: t.color }}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-200 group-hover:text-emerald-400 transition truncate flex-1 mr-1">{c.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                    <span className="text-xs text-slate-400 truncate block">{c.company || 'Sin Empresa'}</span>
                    
                    <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-1">
                      <span className="text-[10px] font-mono text-slate-500">{c.phone}</span>
                      <span className="text-[10px] text-slate-400">
                        {c.last_message_at 
                          ? (c.last_message_at.includes('T') 
                              ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                              : c.last_message_at) 
                          : '—'}
                      </span>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-end gap-2 mt-1 pt-1.5 border-t border-slate-900 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onStartConversation(c.id); }}
                        className="p-1 hover:bg-slate-800 hover:text-emerald-400 rounded transition"
                        title="Enviar Mensaje"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openNoteModal(c.id); }}
                        className="p-1 hover:bg-slate-800 hover:text-amber-400 rounded transition"
                        title="Agregar Nota Interna"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEditModal(c); }}
                        className="p-1 hover:bg-slate-800 hover:text-sky-400 rounded transition"
                        title="Ver / Editar Lead"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                ))}
                {stageContacts.length === 0 && (
                  <div className="h-28 flex items-center justify-center border-2 border-dashed border-slate-800/40 rounded-lg">
                    <p className="text-[10px] text-slate-600">Suelta leads aquí</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK INLINE NOTE MODAL */}
      {noteContactId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleSaveNote} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm">Agregar Nota Interna</h3>
              <button type="button" onClick={() => setNoteContactId(null)} className="text-slate-400 hover:text-slate-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-[10px] text-slate-400">Esta nota se guardará en la cronología y solo será visible para los agentes comerciales.</p>
              <textarea 
                rows="4"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escribe la nota interna (ej. Acordamos llamada de seguimiento el viernes)..."
                className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200 leading-relaxed font-sans"
                required
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button 
                type="button" 
                onClick={() => setNoteContactId(null)}
                className="px-4 py-1.5 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-semibold transition"
              >
                Guardar Nota
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FULL CONTACT CREATION / EDIT MODAL */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-200">
                {editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}
              </h3>
              <button type="button" onClick={() => setContactModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
              {formErrors.submit && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3.5 py-2.5 rounded-lg">
                  {formErrors.submit}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre Completo *</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200"
                    placeholder="Ej: Carlos Gómez"
                    required
                  />
                  {formErrors.name && <span className="text-[10px] text-red-400 mt-0.5">{formErrors.name}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp *</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200"
                    placeholder="Ej: +525512345678"
                    required
                  />
                  {formErrors.phone && <span className="text-[10px] text-red-400 mt-0.5">{formErrors.phone}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200"
                    placeholder="Ej: carlos@gomez.com"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empresa</label>
                  <input 
                    type="text" 
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200"
                    placeholder="Ej: Gómez S.A."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etapa del Embudo</label>
                <select 
                  value={formData.pipelineStageId}
                  onChange={(e) => setFormData(prev => ({ ...prev, pipelineStageId: e.target.value }))}
                  className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200 cursor-pointer"
                >
                  <option value="">Sin Etapa (Default)</option>
                  {stages.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Tags selector in modal */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Etiquetas (Tags)</label>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {availableTags.map(tag => {
                    const isSelected = formData.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const tagIds = prev.tagIds.includes(tag.id)
                              ? prev.tagIds.filter(id => id !== tag.id)
                              : [...prev.tagIds, tag.id];
                            return { ...prev, tagIds };
                          });
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-full border transition font-semibold ${
                          isSelected 
                            ? 'bg-slate-100 text-slate-950 border-white' 
                            : 'bg-slate-900/40 text-slate-300 border-slate-800'
                        }`}
                        style={isSelected ? {} : { borderColor: tag.color + '50', color: tag.color }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                  {availableTags.length === 0 && (
                    <span className="text-[10px] text-slate-500 italic">No hay etiquetas creadas.</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notas / Observaciones</label>
                <textarea 
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200"
                  placeholder="Detalles de interés, requerimientos..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                <button 
                  type="button"
                  onClick={() => setContactModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 rounded-lg text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pipeline;
