import React, { useState } from 'react';
import { Plus, Edit2, Trash2, MessageSquare, Check, X } from 'lucide-react';

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
  });
  const [formErrors, setFormErrors] = useState({});

  const openCreateModal = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      company: '',
      notes: '',
      pipelineStageId: stages[0]?.id || '',
    });
    setFormErrors({});
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
    });
    setFormErrors({});
    setModalOpen(true);
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

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-200">Base de Datos de Leads</h2>
          <p className="text-xs text-slate-400">Administra tus contactos asignados y su estado en el pipeline.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-emerald-600/10 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Contacto</span>
        </button>
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
              <th className="p-4">Etapa</th>
              <th className="p-4">Notas</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {contacts.map(c => {
              const stage = stages.find(s => s.id === c.pipeline_stage_id);
              return (
                <tr key={c.id} className="hover:bg-slate-900/20 transition group">
                  <td className="p-4 font-semibold text-slate-200">{c.name}</td>
                  <td className="p-4 font-mono text-xs text-slate-400">{c.phone}</td>
                  <td className="p-4 text-slate-300">{c.email || '—'}</td>
                  <td className="p-4 text-slate-300">{c.company || '—'}</td>
                  <td className="p-4">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/30 font-medium">
                      {stage ? stage.name : 'Sin Etapa'}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-400 truncate max-w-xs">{c.notes || '—'}</td>
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
            {contacts.length === 0 && (
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
