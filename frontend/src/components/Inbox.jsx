import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Check, 
  CheckCheck, 
  Plus, 
  Search, 
  ChevronRight, 
  Layers, 
  MessageSquare,
  Lock,
  User,
  PlusCircle
} from 'lucide-react';

export function Inbox({ 
  conversations = [], 
  contacts = [], 
  messages = [], 
  activeConvId, 
  setActiveConvId, 
  stages = [], 
  onSendMessage, 
  onUpdateConversationStatus, 
  onUpdateContactStage,
  onCreateContactClick
}) {
  const [inputMessage, setInputMessage] = useState('');
  const [sendType, setSendType] = useState('whatsapp'); // whatsapp, internal
  const messagesEndRef = useRef(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getContactInfo = (contactId) => {
    return contacts.find(c => c.id === contactId) || { name: 'Contacto desconocido', phone: '' };
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConvId) return;

    try {
      await onSendMessage(activeConvId, inputMessage, sendType === 'internal');
      setInputMessage('');
    } catch (err) {
      console.error('[Inbox] Failed to send message:', err);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const activeContact = activeConv ? getContactInfo(activeConv.contact_id) : null;
  const activeChatMessages = messages || [];

  return (
    <div className="flex-1 flex overflow-hidden">
      
      {/* CHAT THREADS LIST */}
      <div className="w-80 border-r border-slate-800/80 flex flex-col bg-slate-950/40">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversaciones</span>
          <button 
            className="p-1 hover:bg-slate-800 rounded transition text-emerald-400" 
            onClick={onCreateContactClick}
            title="Crear conversación"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-900/50">
          {conversations.map(conv => {
            const contact = getContactInfo(conv.contact_id);
            const isActive = conv.id === activeConvId;
            return (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full p-4 text-left flex flex-col gap-1.5 transition ${isActive ? 'bg-slate-900/70 border-r-2 border-emerald-500' : 'hover:bg-slate-900/30'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm truncate text-slate-200">{contact.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {conv.last_message_at 
                      ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400 truncate flex-1">{conv.preview || 'Sin mensajes'}</span>
                  {conv.unread_count > 0 && (
                    <span className="h-5 min-w-5 px-1.5 bg-emerald-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center shrink-0 glow-green">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    conv.status === 'open' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 
                    conv.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>
                    {conv.status.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{contact.phone}</span>
                </div>
              </button>
            );
          })}
          {conversations.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">No hay chats activos.</div>
          )}
        </div>
      </div>

      {/* ACTIVE CONVERSATION MESSAGES */}
      <div className="flex-1 flex flex-col bg-slate-950/20 justify-between">
        
        {/* Chat Header */}
        {activeContact ? (
          <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-emerald-400 border border-slate-700">
                {activeContact.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-200 block leading-tight">{activeContact.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{activeContact.phone}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={activeConv?.status || 'open'}
                onChange={(e) => onUpdateConversationStatus(activeConvId, e.target.value)}
                className="bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded px-2 py-1 outline-none cursor-pointer"
              >
                <option value="open">Abierto (Open)</option>
                <option value="pending">Pendiente (Pending)</option>
                <option value="closed">Resuelto (Closed)</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="h-14 border-b border-slate-800/80 flex items-center justify-center text-slate-500 text-xs">
            Selecciona un chat de la lista
          </div>
        )}

        {/* Message Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeChatMessages.map(msg => {
            const isInternal = msg.direction === 'internal';
            const isOutgoing = msg.direction === 'outgoing';

            if (isInternal) {
              return (
                <div key={msg.id} className="flex justify-center my-1.5">
                  <div className="bg-amber-950/40 border border-amber-500/25 text-amber-200 rounded-xl px-4 py-2.5 text-xs text-left w-full max-w-lg shadow-sm">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[8px] text-amber-400 mb-1">
                      <span className="bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">Nota Interna</span>
                    </div>
                    <span>{msg.content?.body || msg.content}</span>
                    <div className="text-[8px] text-amber-500/50 text-right font-mono mt-1.5">
                      {msg.created_at 
                        ? (msg.created_at.includes('T') 
                            ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : msg.created_at) 
                        : '11:42 AM'}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-md flex flex-col gap-1 ${
                  isOutgoing 
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-slate-100 rounded-br-none border border-emerald-500/10' 
                    : 'bg-slate-800/70 text-slate-100 rounded-bl-none border border-slate-700/50'
                }`}>
                  <span>{msg.content?.body || msg.content}</span>
                  <div className="flex items-center justify-end gap-1.5 self-end text-[9px] text-slate-300/85 font-mono">
                    <span>
                      {msg.created_at 
                        ? (msg.created_at.includes('T') 
                            ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : msg.created_at) 
                        : '11:42 AM'}
                    </span>
                    {isOutgoing && (
                      <span>
                        {msg.status === 'read' 
                          ? <CheckCheck className="w-3.5 h-3.5 text-sky-400" /> 
                          : <Check className="w-3.5 h-3.5 text-slate-400" />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Footer Input */}
        {activeConvId && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/30 flex flex-col gap-2">
            {/* WhatsApp vs Note Toggle Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
              <button 
                type="button"
                onClick={() => setSendType('whatsapp')}
                className={`text-xs font-semibold px-3 py-1 rounded transition ${sendType === 'whatsapp' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-300'}`}
              >
                WhatsApp (Cliente)
              </button>
              <button 
                type="button"
                onClick={() => setSendType('internal')}
                className={`text-xs font-semibold px-3 py-1 rounded transition ${sendType === 'internal' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Nota Interna (Equipo)
              </button>
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={sendType === 'internal' ? 'Escribe una nota interna que solo verá el equipo...' : 'Escribe un mensaje de WhatsApp para el cliente...'}
                className={`flex-1 glass-input rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-all ${
                  sendType === 'internal' 
                    ? 'border-amber-500/30 focus:border-amber-500/60 bg-amber-500/5' 
                    : 'focus:border-emerald-500/60'
                }`}
              />
              <button 
                type="submit"
                className={`p-3 rounded-xl shadow-lg transition flex items-center justify-center shrink-0 active:scale-95 ${
                  sendType === 'internal' 
                    ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-amber-600/10' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/15'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

      </div>

      {/* CONTACT CONTEXT DRAWER */}
      {activeContact && activeConv && (
        <div className="w-72 border-l border-slate-800/80 bg-slate-950/40 p-5 flex flex-col justify-between">
          <div className="space-y-6 overflow-y-auto max-h-[80vh]">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-xl font-bold text-emerald-400 mb-2 shadow-inner">
                {activeContact.name.substring(0, 2).toUpperCase()}
              </div>
              <h3 className="font-bold text-sm text-slate-200 leading-tight">{activeContact.name}</h3>
              <span className="text-[10px] text-slate-400">{activeContact.company || 'Sin Empresa'}</span>
            </div>

            <div className="space-y-4">
              <div className="border-t border-slate-800 pt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Celular</span>
                <span className="text-xs font-mono text-slate-300">{activeContact.phone}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</span>
                <span className="text-xs text-slate-300 truncate block">{activeContact.email || '—'}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Notas</span>
                <p className="text-xs text-slate-400 bg-slate-900/40 p-2.5 rounded border border-slate-800 leading-relaxed max-h-36 overflow-y-auto">
                  {activeContact.notes || 'Sin anotaciones.'}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Etapa de Pipeline</span>
                <div className="mt-1 space-y-1">
                  {stages.map(s => {
                    const isCurrent = activeContact.pipeline_stage_id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => onUpdateContactStage(activeContact.id, s.id)}
                        className={`w-full flex items-center justify-between text-left px-2 py-1 rounded text-xs border transition ${
                          isCurrent ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900/40'
                        }`}
                      >
                        <span>{s.name}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Asignado a:</span>
              <span className="font-semibold text-emerald-400">Carlos Agente</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inbox;
