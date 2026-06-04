import React from 'react';
import { Layers, Bot } from 'lucide-react';

export function Settings({ settings, setSettings, onSaveSettings }) {
  if (!settings) return null;

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-200">Ajustes del Sistema</h2>
        <p className="text-xs text-slate-400">Configura tus credenciales de YCloud API y las reglas del chatbot de Inteligencia Artificial.</p>
      </div>

      <div className="space-y-6">
        {/* Integration Credentials Section */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Conexión de WhatsApp Cloud (YCloud)</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">YCloud API Key</label>
              <input 
                type="password" 
                value={settings.ycloud_api_key?.apiKey || ''} 
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  ycloud_api_key: { apiKey: e.target.value }
                }))}
                className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200"
                placeholder="Introducir YCloud API Key"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Phone ID</label>
              <input 
                type="text" 
                value={settings.whatsapp_phone_id?.phoneId || ''} 
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whatsapp_phone_id: { phoneId: e.target.value }
                }))}
                className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200"
                placeholder="Introducir WhatsApp Phone ID"
              />
            </div>
          </div>
        </div>

        {/* AI Chatbot Configuration */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>Chatbot Inteligencia Artificial (Auto-Respuesta)</span>
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.ai_config?.enabled || false} 
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  ai_config: { ...prev.ai_config, enabled: e.target.checked }
                }))}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-slate-100"></div>
            </label>
          </div>

          {settings.ai_config?.enabled && (
            <div className="flex flex-col gap-1.5 mt-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instrucción del Sistema (System Prompt)</label>
              <textarea
                rows="4"
                value={settings.ai_config?.prompt || ''}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  ai_config: { ...prev.ai_config, prompt: e.target.value }
                }))}
                className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200 leading-relaxed font-sans"
                placeholder="Escribe el prompt del chatbot..."
              ></textarea>
              <span className="text-[10px] text-slate-500">Este prompt controlará las respuestas que genera la inteligencia artificial cuando reciba un mensaje.</span>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button 
            onClick={onSaveSettings}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-lg text-sm shadow-lg shadow-emerald-600/10 transition active:scale-95"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
