import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MessageSquare, Check, X } from 'lucide-react';
import crmService from '../services/crmService';

export function Contacts({ 
  contacts = [], 
  stages = [], 
  onCreateContact, 
  onUpdateContact, 
  onDeleteContact,
  onStartConversation 
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  
  // Form State
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

  // Tags States
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedFilterTagId, setSelectedFilterTagId] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [showNewTagForm, setShowNewTagForm] = useState(false);

  const fetchTags = async () => {
    try {
      const tags = await crmService.getTags();
      setAvailableTags(tags);
    } catch (err) {
      console.error('[Contacts] Failed to load tags:', err);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [contacts]); // Sync tags on contact list updates

  const openCreateModal = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      company: '',
      notes: '',
      pipelineStageId: stages[0]?.id || '',
      tagIds: []
    });
    setFormErrors({});
    setShowNewTagForm(false);
    setNewTagName('');
    setModalOpen(true);
  };

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
    setShowNewTagForm(false);
    setNewTagName('');
    setModalOpen(true);
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const tag = await crmService.createTag({
        name: newTagName.trim(),
        color: newTagColor
      });
      setAvailableTags(prev => [...prev, tag]);
      setFormData(prev => ({
        ...prev,
        tagIds: [...prev.tagIds, tag.id]
      }));
      setNewTagName('');
      setShowNewTagForm(false);
    } catch (err) {
      console.error('[Contacts] Error creating tag:', err);
      alert('Error al crear la etiqueta');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres.';
    }
    const phonePattern = /^\+?[1-9]\d{1,14}$/;
    if (!formData.phone || !phonePattern.test(formData.phone.replace(/\s+/g, ''))) {
      errors.phone = 'Teléfono inválido. Debe incluir código de país (ej: +525512345678).';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Correo electrónico inválido.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Sanitize payload
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
      setModalOpen(false);
    } catch (err) {
      console.error('[Contacts] Error saving contact:', err);
      setFormErrors({ submit: err.response?.data?.error || 'Error al guardar el contacto.' });
    }
  };

  const handleDelete = (contactId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este contacto?')) {
      onDeleteContact(contactId);
    }
  };

  // Filter contacts by tag
  const filteredContacts = contacts.filter(c => {
    if (!selectedFilterTagId) return true;
    return (c.tags || []).some(t => t.id === selectedFilterTagId);
  });

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-200">Base de Datos de Leads</h2>
          <p className="text-xs text-slate-400">Administra tus contactos asignados y su estado en el pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tag Filter */}
          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtrar por etiqueta:</span>
            <select
              value={selectedFilterTagId}
              onChange={(e) => setSelectedFilterTagId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer font-semibold border-none"
            >
              <option value="" className="bg-slate-900 text-slate-300">Todas las etiquetas</option>
              {availableTags.map(tag => (
                <option key={tag.id} value={tag.id} className="bg-slate-900" style={{ color: tag.color }}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-emerald-600/10 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Contacto</span>
          </button>
        </div>
      </div>

      {/* TABLE LIST */}
      <div className="glass-panel rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <th className="p-4">Nombre</th>
              <th className="p-4">WhatsApp</th>
              <th className="p-4">Email</th>
              <th className="p-4">Empresa</th>
              <th className="p-4">Etiquetas</th>
              <th className="p-4">Etapa</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredContacts.map(c => {
              const stage = stages.find(s => s.id === c.pipeline_stage_id);
              return (
                <tr key={c.id} className="hover:bg-slate-900/20 transition group">
                  <td className="p-4 font-semibold text-slate-200">{c.name}</td>
                  <td className="p-4 font-mono text-xs text-slate-400">{c.phone}</td>
                  <td className="p-4 text-slate-300">{c.email || '—'}</td>
                  <td className="p-4 text-slate-300">{c.company || '—'}</td>
                  <td className="p-4">
                    <div className="flex gap-1.5 flex-wrap max-w-xs">
                      {(c.tags || []).map(t => (
                        <span 
                          key={t.id} 
                          className="text-[9px] px-2.5 py-0.5 rounded-full border font-medium"
                          style={{ backgroundColor: t.color + '15', borderColor: t.color + '40', color: t.color }}
                        >
                          {t.name}
                        </span>
                      ))}
                      {(!c.tags || c.tags.length === 0) && <span className="text-slate-600 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-medium">
                      {stage ? stage.name : 'Sin Etapa'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => onStartConversation(c.id)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded transition"
                        title="Iniciar Chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openEditModal(c)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded transition"
                        title="Editar Contacto"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded transition"
                        title="Eliminar Contacto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredContacts.length === 0 && (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-500">No hay contactos registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-200">
                {editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[75vh]">
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
                    className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:border-emerald-500 transition-colors"
                    placeholder="Ej: Carlos Gómez"
                    required
                  />
                  {formErrors.name && <span className="text-[10px] text-red-400 mt-0.5">{formErrors.name}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp (E.164) *</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:border-emerald-500 transition-colors"
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
                    className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:border-emerald-500 transition-colors"
                    placeholder="Ej: carlos@gomez.com"
                  />
                  {formErrors.email && <span className="text-[10px] text-red-400 mt-0.5">{formErrors.email}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Empresa</label>
                  <input 
                    type="text" 
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:border-emerald-500 transition-colors"
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

              {/* Tags Selector & Creator */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Etiquetas (Tags)</label>
                  <button 
                    type="button"
                    onClick={() => setShowNewTagForm(!showNewTagForm)}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                  >
                    {showNewTagForm ? 'Cancelar' : '+ Nueva Etiqueta'}
                  </button>
                </div>

                {showNewTagForm && (
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col gap-2 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Nombre de la etiqueta..."
                        className="glass-input rounded px-2.5 py-1 text-xs text-slate-200 flex-1"
                      />
                      <button 
                        type="button"
                        onClick={handleCreateTag}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs font-semibold"
                      >
                        Crear
                      </button>
                    </div>
                    <div className="flex gap-1.5 flex-wrap items-center mt-1">
                      {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#6B7280'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTagColor(color)}
                          className={`w-5 h-5 rounded-full border transition-all ${
                            newTagColor === color ? 'ring-2 ring-white scale-110' : 'border-slate-800'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}

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
                            ? 'bg-slate-100 text-slate-950 border-white font-bold scale-105 shadow-md shadow-white/5' 
                            : 'bg-slate-900/40 text-slate-300 border-slate-800 hover:border-slate-700'
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
                  className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200 leading-relaxed font-sans"
                  placeholder="Detalles de interés, requerimientos..."
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition"
                >
                  {editingContact ? 'Guardar Cambios' : 'Crear Contacto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Contacts;
