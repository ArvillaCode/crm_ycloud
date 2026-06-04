import React, { useState } from 'react';
import { 
  MessageSquare, 
  Users, 
  Trello, 
  Settings as SettingsIcon, 
  ChevronRight, 
  Building2, 
  User, 
  LogOut 
} from 'lucide-react';

export function Sidebar({ 
  activeTab, 
  setActiveTab, 
  currentUser, 
  selectedOrg, 
  setSelectedOrg, 
  organizations = [], 
  onLogout,
  token 
}) {
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const isLocalMode = token === 'mock_jwt_token_for_preview';

  return (
    <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col justify-between z-20">
      <div>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-500/20">
            W
          </div>
          <div>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">YCloud CRM</span>
            <span className="text-[10px] block text-emerald-400 font-medium uppercase tracking-wider">
              {isLocalMode ? 'Modo Local' : 'Conectado a API'}
            </span>
          </div>
        </div>

        {/* Org Selector */}
        {organizations.length > 0 && (
          <div className="p-4 relative">
            <button 
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/60 rounded-lg border border-slate-800 text-left hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm font-medium truncate">{selectedOrg ? selectedOrg.name : 'Cargando...'}</span>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${orgDropdownOpen ? 'rotate-90' : ''}`} />
            </button>

            {orgDropdownOpen && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-30 py-1 max-h-48 overflow-y-auto">
                {organizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setSelectedOrg(org);
                      setOrgDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-800 transition ${selectedOrg?.id === org.id ? 'text-emerald-400 bg-slate-800/40' : 'text-slate-300'}`}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="px-3 space-y-1">
          <button 
            onClick={() => setActiveTab('inbox')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'inbox' ? 'bg-emerald-600/10 text-emerald-400 border-l-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Bandeja de Entrada</span>
          </button>
          <button 
            onClick={() => setActiveTab('contacts')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'contacts' ? 'bg-emerald-600/10 text-emerald-400 border-l-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'}`}
          >
            <Users className="w-4 h-4" />
            <span>Contactos</span>
          </button>
          <button 
            onClick={() => setActiveTab('pipelines')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'pipelines' ? 'bg-emerald-600/10 text-emerald-400 border-l-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'}`}
          >
            <Trello className="w-4 h-4" />
            <span>Embudo / Pipelines</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'settings' ? 'bg-emerald-600/10 text-emerald-400 border-l-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'}`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Configuración</span>
          </button>
        </nav>
      </div>

      {/* User Card footer with logout */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="overflow-hidden">
            <span className="text-xs font-semibold block text-slate-200 truncate">{currentUser?.name || 'Usuario'}</span>
            <span className="text-[9px] block text-slate-400 truncate">{currentUser?.email || 'email@company.com'}</span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
