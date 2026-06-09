import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import crmService from './services/crmService';
import Sidebar from './components/Sidebar';
import Inbox from './components/Inbox';
import Contacts from './components/Contacts';
import Pipeline from './components/Pipeline';
import Settings from './components/Settings';
import { Search, Lock } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api', '') 
  : 'http://localhost:5000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  
  // Navigation & UI tabs
  const [activeTab, setActiveTab] = useState('inbox'); // inbox, contacts, pipelines, settings
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  // Core CRM states
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  
  // Pipeline columns / stages
  const [stages, setStages] = useState([]);
  
  // Global settings state
  const [settings, setSettings] = useState(null);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('carlos@company.com');
  const [loginPassword, setLoginPassword] = useState('carlos123');
  const [loginOrgId, setLoginOrgId] = useState('');
  const [loginError, setLoginError] = useState('');

  const socketRef = useRef(null);

  // Parse user info from token update
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, [token]);

  // Load organizations for login screen
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const orgs = await crmService.getOrganizations();
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setLoginOrgId(orgs[0].id);
          setSelectedOrg(orgs[0]);
        }
      } catch (err) {
        console.error('[App] Failed to load organizations:', err);
      }
    };
    fetchOrgs();
  }, [token]);

  // Handle Login Submit
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await crmService.login(loginEmail, loginPassword, loginOrgId);
      const { token: receivedToken, user } = response;
      
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      const matchedOrg = organizations.find(o => o.id === user.organizationId);
      if (matchedOrg) setSelectedOrg(matchedOrg);

      setToken(receivedToken);
      setCurrentUser(user);
    } catch (err) {
      // Local Mock Fallback if backend is down or unreachable (Preview Mode)
      if (!err.response && !import.meta.env.PROD) {
        console.warn('[App] Offline fallback: Authenticating with Local Mock Preview.');
        const mockToken = 'mock_jwt_token_for_preview';
        const mockUser = {
          id: 'user_mock_1',
          name: 'Carlos Agente (Preview Mode)',
          email: loginEmail,
          role: 'admin',
          organizationId: loginOrgId || '1615f5c8-12cd-44c1-9038-f1c5d98e821b'
        };
        
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
        
        const matchedOrg = organizations.find(o => o.id === mockUser.organizationId);
        if (matchedOrg) setSelectedOrg(matchedOrg);
        
        setToken(mockToken);
        setCurrentUser(mockUser);
        return;
      }
      setLoginError(err.response?.data?.error || 'Credenciales inválidas o error de conexión');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await crmService.logout();
    } catch (err) {
      console.warn('[App] Failed to invoke logout API:', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setCurrentUser(null);
    setContacts([]);
    setConversations([]);
    setMessages([]);
    setActiveConvId(null);
    if (socketRef.current) socketRef.current.disconnect();
  };

  // Fetch core CRM states when active tab/org changes
  useEffect(() => {
    if (!token || !selectedOrg) return;

    const fetchCrmData = async () => {
      try {
        const contactList = await crmService.getContacts();
        setContacts(contactList);

        const convs = await crmService.getConversations('open');
        setConversations(convs);
        if (convs.length > 0 && !activeConvId) {
          setActiveConvId(convs[0].id);
        }

        const settingsData = await crmService.getSettings();
        setSettings(settingsData);

        const pipelines = await crmService.getPipelines();
        if (pipelines.length > 0) {
          const pipelineStages = await crmService.getPipelineStages(pipelines[0].id);
          setStages(pipelineStages);
        }
      } catch (err) {
        console.error('[App] Error fetching dashboard data:', err);
      }
    };

    fetchCrmData();
  }, [token, selectedOrg, activeTab]);

  // Fetch messages when active conversation updates
  useEffect(() => {
    if (!token || !activeConvId) return;

    const fetchMessages = async () => {
      try {
        const data = await crmService.getMessages(activeConvId);
        setMessages(data);
        // Clear locally tracked unread count
        setConversations(prev => 
          prev.map(c => c.id === activeConvId ? { ...c, unread_count: 0 } : c)
        );
      } catch (err) {
        console.error('[App] Error loading messages:', err);
      }
    };
    fetchMessages();
  }, [token, activeConvId]);

  // Connect Socket.io client for real-time gateway communications
  useEffect(() => {
    if (!token || !currentUser || token === 'mock_jwt_token_for_preview') return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('[Socket] Connected to real-time gateway');
    });

    socketRef.current.on('new_message', (data) => {
      const { conversationId, message } = data;

      if (conversationId === activeConvId) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id || m.whatsapp_message_id === message.whatsapp_message_id)) return prev;
          return [...prev, message];
        });
      }

      setConversations(prev => {
        const index = prev.findIndex(c => c.id === conversationId);
        if (index === -1) {
          crmService.getConversations('open').then(res => setConversations(res));
          return prev;
        }

        return prev.map(c => {
          if (c.id === conversationId) {
            return {
              ...c,
              preview: message.content?.body || '[Archivo]',
              last_message_at: message.created_at || new Date().toISOString(),
              unread_count: conversationId === activeConvId ? 0 : c.unread_count + 1
            };
          }
          return c;
        });
      });
    });

    socketRef.current.on('contact_created', (newContact) => {
      setContacts(prev => {
        if (prev.some(c => c.id === newContact.id)) return prev;
        return [newContact, ...prev];
      });
    });

    socketRef.current.on('contact_updated', (updatedContact) => {
      setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
    });

    socketRef.current.on('contact_deleted', (data) => {
      const { id } = data;
      setContacts(prev => prev.filter(c => c.id !== id));
      setConversations(prev => prev.filter(c => c.contact_id !== id));
      setConversations(prev => {
        const activeC = prev.find(c => c.id === activeConvId);
        if (activeC && activeC.contact_id === id) {
          setActiveConvId(null);
        }
        return prev;
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token, currentUser, activeConvId]);

  // 1. Create a contact via full form modal
  const handleCreateContact = async (contactData) => {
    const data = await crmService.createContact(contactData);
    setContacts(prev => [data, ...prev]);

    // Re-sync conversations list
    const convs = await crmService.getConversations('open');
    setConversations(convs);
    return data;
  };

  // 2. Update a contact details
  const handleUpdateContact = async (contactId, contactData) => {
    const data = await crmService.updateContact(contactId, contactData);
    setContacts(prev => prev.map(c => c.id === contactId ? data : c));
    return data;
  };

  // 3. Delete contact
  const handleDeleteContact = async (contactId) => {
    await crmService.deleteContact(contactId);
    setContacts(prev => prev.filter(c => c.id !== contactId));
    setConversations(prev => prev.filter(c => c.contact_id !== contactId));
    if (activeConvId) {
      const activeC = conversations.find(c => c.id === activeConvId);
      if (activeC && activeC.contact_id === contactId) {
        setActiveConvId(null);
      }
    }
  };

  // 4. Start conversation for contact
  const handleStartConversation = async (contactId) => {
    try {
      const conv = await crmService.createConversation(contactId);
      
      const convs = await crmService.getConversations('open');
      setConversations(convs);
      
      setActiveConvId(conv.id);
      setActiveTab('inbox');
    } catch (err) {
      console.error('[App] Error starting conversation:', err);
      alert('Error al iniciar conversación');
    }
  };

  // 5. Update conversation resolution status
  const handleUpdateConversationStatus = async (conversationId, status) => {
    try {
      await crmService.updateConversationStatus(conversationId, status);
      const convs = await crmService.getConversations('open');
      setConversations(convs);
      if (activeConvId === conversationId && status !== 'open') {
        setActiveConvId(null);
      }
    } catch (err) {
      console.error('[App] Error updating conversation status:', err);
    }
  };

  // 6. Update contact stage in pipeline
  const handleUpdateContactStage = async (contactId, stageId) => {
    try {
      await crmService.updateContact(contactId, { pipelineStageId: stageId });
      setContacts(prev => 
        prev.map(c => c.id === contactId ? { ...c, pipeline_stage_id: stageId } : c)
      );
    } catch (err) {
      console.error('[App] Error updating contact pipeline stage:', err);
    }
  };

  // 7. Send message / internal notes
  const handleSendMessage = async (conversationId, body, isInternal = false) => {
    try {
      const response = await crmService.sendMessage(conversationId, body, 'text', isInternal);
      setMessages(prev => [...prev, response]);
      
      // Update preview context in threads list
      setConversations(prev => 
        prev.map(c => 
          c.id === conversationId 
            ? { ...c, preview: body, last_message_at: new Date().toISOString() } 
            : c
        )
      );

      // Simulate local chatbot reply inside Mock Preview mode
      if (token === 'mock_jwt_token_for_preview' && settings?.ai_config?.enabled && !isInternal) {
        setTimeout(() => {
          const aiResponse = `[Chatbot AI] Recibido. Procesaremos su solicitud bajo la directiva: "${settings.ai_config.prompt.substring(0, 30)}..."`;
          const aiMsg = {
            id: `m_mock_ai_${Date.now()}`,
            direction: 'incoming',
            message_type: 'text',
            content: { body: aiResponse },
            status: 'read',
            created_at: new Date().toISOString()
          };
          setMessages(prev => [...prev, aiMsg]);
          setConversations(prev => 
            prev.map(c => c.id === conversationId ? { ...c, preview: aiResponse, last_message_at: new Date().toISOString() } : c)
          );
        }, 1200);
      }
    } catch (err) {
      console.error('[App] Error dispatching message:', err);
      alert('Error al enviar mensaje');
    }
  };

  // 8. Save Settings
  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      await crmService.saveSettings('ycloud_api_key', settings.ycloud_api_key);
      await crmService.saveSettings('whatsapp_phone_id', settings.whatsapp_phone_id);
      await crmService.saveSettings('ai_config', settings.ai_config);
      alert('Configuración guardada correctamente.');
    } catch (err) {
      console.error('[App] Error saving settings:', err);
      alert('Error al guardar ajustes.');
    }
  };

  // Render Authentication screen if not logged in
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
        {/* Glow styling backgrounds */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <form onSubmit={handleLogin} className="w-full max-w-md p-8 glass-panel rounded-2xl border border-slate-800 shadow-2xl relative z-10 flex flex-col gap-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center font-bold text-white shadow-xl shadow-emerald-500/20 mx-auto text-xl mb-2 animate-pulse">
              W
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Iniciar Sesión en CRM</h1>
            <p className="text-xs text-slate-400">Introduce tus credenciales para acceder al panel comercial.</p>
          </div>

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3.5 py-2.5 rounded-lg">
              {loginError}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Organización</label>
              <select 
                value={loginOrgId}
                onChange={(e) => setLoginOrgId(e.target.value)}
                className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200 cursor-pointer"
              >
                {organizations.map(o => (
                  <option key={o.id} value={o.id} className="bg-slate-900">{o.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
              <input 
                type="email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="glass-input rounded-lg pl-3.5 pr-10 py-2 text-sm text-slate-200 w-full"
                  required
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-sm shadow-lg shadow-emerald-600/10 transition mt-2 active:scale-95"
          >
            Conectarse
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-slate-100 bg-slate-950">
      
      {/* modular SIDEBAR */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        selectedOrg={selectedOrg}
        setSelectedOrg={setSelectedOrg}
        organizations={organizations}
        onLogout={handleLogout}
        token={token}
      />

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
        
        {/* Glow gradients */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-10 left-1/3 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[140px] pointer-events-none"></div>

        {/* TOP BAR */}
        <header className="h-16 glass-panel border-b border-slate-800 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight capitalize">
              {activeTab === 'inbox' && 'Bandeja de Entrada'}
              {activeTab === 'contacts' && 'Contactos CRM'}
              {activeTab === 'pipelines' && 'Embudo de Ventas'}
              {activeTab === 'settings' && 'Ajustes de Organización'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar lead..."
                className="bg-transparent text-xs text-slate-200 outline-none w-48"
              />
            </div>
            <div className="text-xs bg-slate-800 text-slate-300 font-medium px-2.5 py-1 rounded-full border border-slate-700">
              {token === 'mock_jwt_token_for_preview' ? 'Modo Preview (Offline)' : 'Org Token Activo'}
            </div>
          </div>
        </header>

        {/* CONTAINER CONTENT */}
        <section className="flex-1 overflow-hidden flex relative z-10">

          {/* VIEW: INBOX */}
          {activeTab === 'inbox' && (
            <Inbox 
              conversations={conversations}
              contacts={contacts}
              messages={messages}
              activeConvId={activeConvId}
              setActiveConvId={setActiveConvId}
              stages={stages}
              onSendMessage={handleSendMessage}
              onUpdateConversationStatus={handleUpdateConversationStatus}
              onUpdateContactStage={handleUpdateContactStage}
              onCreateContactClick={() => setActiveTab('contacts')}
            />
          )}

          {/* VIEW: CONTACTS */}
          {activeTab === 'contacts' && (
            <Contacts 
              contacts={contacts}
              stages={stages}
              onCreateContact={handleCreateContact}
              onUpdateContact={handleUpdateContact}
              onDeleteContact={handleDeleteContact}
              onStartConversation={handleStartConversation}
            />
          )}

          {/* VIEW: PIPELINES */}
          {activeTab === 'pipelines' && (
            <Pipeline 
              contacts={contacts}
              stages={stages}
              onStageChange={handleUpdateContactStage}
              onStartConversation={handleStartConversation}
              onCreateContact={handleCreateContact}
              onUpdateContact={handleUpdateContact}
            />
          )}

          {/* VIEW: SETTINGS */}
          {activeTab === 'settings' && (
            <Settings 
              settings={settings}
              setSettings={setSettings}
              onSaveSettings={handleSaveSettings}
            />
          )}

        </section>
      </main>

    </div>
  );
}

export default App;
