import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from './services/api';
import { 
  MessageSquare, 
  Users, 
  Trello, 
  Settings as SettingsIcon, 
  Send, 
  Check, 
  CheckCheck, 
  User, 
  Search, 
  Building2, 
  Plus, 
  ChevronRight, 
  Bot,
  Layers,
  LogOut,
  Lock
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  
  // App state
  const [activeTab, setActiveTab] = useState('inbox'); // inbox, contacts, pipelines, settings
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  
  // Data State
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  
  // Pipeline details
  const [stages, setStages] = useState([]);
  
  // Settings Form States
  const [settings, setSettings] = useState({
    ycloud_api_key: { apiKey: 'yc_live_59h8s7d8sa9d8as8712' },
    whatsapp_phone_id: { phoneId: '109283748293749' },
    ai_config: { enabled: true, prompt: 'Actúa como un agente de ventas empático. Responde en español, sé directo pero amable.' }
  });

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('carlos@company.com');
  const [loginPassword, setLoginPassword] = useState('carlos123');
  const [loginOrgId, setLoginOrgId] = useState('');
  const [loginError, setLoginError] = useState('');

  const socketRef = useRef(null);

  // Parse current user from token on load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, [token]);

  // 1. Fetch initial organizations for the login screen
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const response = await api.get('/auth/organizations');
        setOrganizations(response.data);
        if (response.data.length > 0) {
          setLoginOrgId(response.data[0].id);
          setSelectedOrg(response.data[0]);
        }
      } catch (err) {
        console.warn('[Frontend] Cannot fetch organizations, falling back to static options.');
        const staticOrgs = [
          { id: '1615f5c8-12cd-44c1-9038-f1c5d98e821b', name: 'Inmobiliaria Sol S.A.' },
          { id: '2615f5c8-12cd-44c1-9038-f1c5d98e821b', name: 'TechSolutions SpA' },
          { id: '3615f5c8-12cd-44c1-9038-f1c5d98e821b', name: 'Gym Fitness Club' }
        ];
        setOrganizations(staticOrgs);
        setLoginOrgId(staticOrgs[0].id);
        setSelectedOrg(staticOrgs[0]);
      }
    };
    fetchOrgs();
  }, []);

  // 2. Handle Login Submit
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await api.post('/auth/login', {
        email: loginEmail,
        password: loginPassword,
        organizationId: loginOrgId
      });
      const { token: receivedToken, user } = response.data;
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      const matchedOrg = organizations.find(o => o.id === user.organizationId);
      if (matchedOrg) setSelectedOrg(matchedOrg);

      setToken(receivedToken);
      setCurrentUser(user);
    } catch (err) {
      // Local Mock Fallback if backend is down (Development only)
      if (!err.response && !import.meta.env.PROD) {
        console.warn('[Frontend] Backend down or unreachable. Authenticating using mock local state.');
        const mockUser = {
          id: 'user_mock_1',
          name: 'Carlos Agente (Preview Mode)',
          email: loginEmail,
          role: 'admin',
          organizationId: loginOrgId || '1615f5c8-12cd-44c1-9038-f1c5d98e821b'
        };
        const mockToken = 'mock_jwt_token_for_preview';
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
        
        const matchedOrg = organizations.find(o => o.id === mockUser.organizationId);
        if (matchedOrg) setSelectedOrg(matchedOrg);
        
        setToken(mockToken);
        setCurrentUser(mockUser);
        
        // Seed default states
        setContacts([
          { id: 'c_1', name: 'Alejandro Gómez', phone: '+52 55 1234 5678', email: 'alejandro@gomez.com', company: 'Inversiones Gómez', notes: 'Interesado en departamento de 2 recámaras en Polanco.', pipeline_stage_id: 'stage_1', assigned_user_id: 'u_1', last_message_at: '11:42 AM' },
          { id: 'c_2', name: 'María Rodríguez', phone: '+34 612 345 678', email: 'maria.r@gmail.com', company: 'Freelance Design', notes: 'Preguntó por costos de soporte premium.', pipeline_stage_id: 'stage_2', assigned_user_id: 'u_2', last_message_at: '10:15 AM' },
          { id: 'c_3', name: 'Carlos Mendoza', phone: '+54 9 11 9876 5432', email: 'carlos@mendoza.co', company: 'E-commerce Corp', notes: 'Solicitó demo de la plataforma.', pipeline_stage_id: 'stage_1', assigned_user_id: 'u_1', last_message_at: 'Ayer' },
          { id: 'c_4', name: 'Laura Martinez', phone: '+56 9 8765 4321', email: 'laura@martinez.cl', company: 'Minera del Norte', notes: 'Trato cerrado. Pendiente de onboarding.', pipeline_stage_id: 'stage_3', assigned_user_id: 'u_1', last_message_at: '30 May' }
        ]);
        setConversations([
          { id: 'conv_1', contact_id: 'c_1', status: 'open', unread_count: 2, last_message_at: '11:42 AM', preview: 'Me gustaría agendar una visita mañana por la tarde' },
          { id: 'conv_2', contact_id: 'c_2', status: 'open', unread_count: 0, last_message_at: '10:15 AM', preview: 'Muchas gracias por la respuesta' },
          { id: 'conv_3', contact_id: 'c_3', status: 'pending', unread_count: 0, last_message_at: 'Ayer', preview: '¿Tienen integración con ERP?' },
          { id: 'conv_4', contact_id: 'c_4', status: 'closed', unread_count: 0, last_message_at: '30 May', preview: 'Perfecto, quedamos en contacto' }
        ]);
        setStages([
          { id: 'stage_1', name: 'Nuevo Lead', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
          { id: 'stage_2', name: 'En Progreso', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
          { id: 'stage_3', name: 'Cerrado Ganado', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
        ]);
        setActiveConvId('conv_1');
        return;
      }
      setLoginError(err.response?.data?.error || 'Credenciales inválidas o error de conexión');
    }
  };

  // 3. Handle Logout
  const handleLogout = async () => {
    try {
      if (token !== 'mock_jwt_token_for_preview') {
        await api.post('/auth/logout');
      }
    } catch (err) {
      console.warn('[Frontend] Failed to invoke logout API on backend:', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setCurrentUser(null);
    if (socketRef.current) socketRef.current.disconnect();
  };

  // 4. Fetch main data when org or tab changes
  useEffect(() => {
    if (!token || !selectedOrg) return;

    if (token === 'mock_jwt_token_for_preview') {
      if (contacts.length === 0) {
        setContacts([
          { id: 'c_1', name: 'Alejandro Gómez', phone: '+52 55 1234 5678', email: 'alejandro@gomez.com', company: 'Inversiones Gómez', notes: 'Interesado en departamento de 2 recámaras en Polanco.', pipeline_stage_id: 'stage_1', assigned_user_id: 'u_1', last_message_at: '11:42 AM' },
          { id: 'c_2', name: 'María Rodríguez', phone: '+34 612 345 678', email: 'maria.r@gmail.com', company: 'Freelance Design', notes: 'Preguntó por costos de soporte premium.', pipeline_stage_id: 'stage_2', assigned_user_id: 'u_2', last_message_at: '10:15 AM' },
          { id: 'c_3', name: 'Carlos Mendoza', phone: '+54 9 11 9876 5432', email: 'carlos@mendoza.co', company: 'E-commerce Corp', notes: 'Solicitó demo de la plataforma.', pipeline_stage_id: 'stage_1', assigned_user_id: 'u_1', last_message_at: 'Ayer' },
          { id: 'c_4', name: 'Laura Martinez', phone: '+56 9 8765 4321', email: 'laura@martinez.cl', company: 'Minera del Norte', notes: 'Trato cerrado. Pendiente de onboarding.', pipeline_stage_id: 'stage_3', assigned_user_id: 'u_1', last_message_at: '30 May' }
        ]);
        setConversations([
          { id: 'conv_1', contact_id: 'c_1', status: 'open', unread_count: 2, last_message_at: '11:42 AM', preview: 'Me gustaría agendar una visita mañana por la tarde' },
          { id: 'conv_2', contact_id: 'c_2', status: 'open', unread_count: 0, last_message_at: '10:15 AM', preview: 'Muchas gracias por la respuesta' },
          { id: 'conv_3', contact_id: 'c_3', status: 'pending', unread_count: 0, last_message_at: 'Ayer', preview: '¿Tienen integración con ERP?' },
          { id: 'conv_4', contact_id: 'c_4', status: 'closed', unread_count: 0, last_message_at: '30 May', preview: 'Perfecto, quedamos en contacto' }
        ]);
        setStages([
          { id: 'stage_1', name: 'Nuevo Lead', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
          { id: 'stage_2', name: 'En Progreso', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
          { id: 'stage_3', name: 'Cerrado Ganado', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
        ]);
        setActiveConvId('conv_1');
      }
      return;
    }

    const fetchOrgData = async () => {
      try {
        const contactsRes = await api.get('/contacts');
        setContacts(contactsRes.data);

        const conversationsRes = await api.get('/conversations?status=open');
        setConversations(conversationsRes.data);
        if (conversationsRes.data.length > 0 && !activeConvId) {
          setActiveConvId(conversationsRes.data[0].id);
        }

        const settingsRes = await api.get('/settings');
        setSettings({
          ycloud_api_key: settingsRes.data.ycloud_api_key || { apiKey: '' },
          whatsapp_phone_id: settingsRes.data.whatsapp_phone_id || { phoneId: '' },
          ai_config: settingsRes.data.ai_config || { enabled: false, prompt: '' }
        });

        const pipelinesRes = await api.get('/pipelines');
        if (pipelinesRes.data.length > 0) {
          const stagesRes = await api.get(`/pipelines/${pipelinesRes.data[0].id}/stages`);
          setStages(stagesRes.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchOrgData();
  }, [token, selectedOrg, activeTab]);

  // 5. Fetch messages when active conversation changes
  useEffect(() => {
    if (!token || !activeConvId) return;

    if (token === 'mock_jwt_token_for_preview') {
      const mockMessagesMap = {
        'conv_1': [
          { id: 'm1', direction: 'incoming', message_type: 'text', content: { body: 'Hola, vi su anuncio del departamento en Polanco.' }, status: 'read', created_at: '11:30 AM' },
          { id: 'm2', direction: 'outgoing', message_type: 'text', content: { body: '¡Hola! Claro que sí Alejandro. Tenemos unidades disponibles. ¿Qué dudas tienes?' }, status: 'read', created_at: '11:32 AM' },
          { id: 'm3', direction: 'incoming', message_type: 'text', content: { body: 'Me gustaría agendar una visita mañana por la tarde. ¿Se puede?' }, status: 'read', created_at: '11:42 AM' }
        ],
        'conv_2': [
          { id: 'm4', direction: 'incoming', message_type: 'text', content: { body: 'Hola, ¿el plan de soporte mensual cubre integraciones personalizadas?' }, status: 'read', created_at: '10:00 AM' },
          { id: 'm5', direction: 'outgoing', message_type: 'text', content: { body: 'Hola María. El plan Premium sí cubre hasta 5 horas de desarrollo personalizado.' }, status: 'read', created_at: '10:10 AM' },
          { id: 'm6', direction: 'incoming', message_type: 'text', content: { body: 'Muchas gracias por la respuesta. Lo estaré contratando en la tarde.' }, status: 'read', created_at: '10:15 AM' }
        ]
      };
      setMessages(mockMessagesMap[activeConvId] || []);
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await api.get(`/conversations/${activeConvId}/messages`);
        setMessages(response.data);
        setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, unread_count: 0 } : c));
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };
    fetchMessages();
  }, [token, activeConvId]);

  // 6. Connect Socket.io client for real-time messages
  useEffect(() => {
    if (!token || !currentUser || token === 'mock_jwt_token_for_preview') return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket']
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
          api.get('/conversations?status=open').then(res => setConversations(res.data));
          return prev;
        }

        return prev.map(c => {
          if (c.id === conversationId) {
            return {
              ...c,
              preview: message.content.body || '[Archivo]',
              last_message_at: 'Ahora',
              unread_count: conversationId === activeConvId ? 0 : c.unread_count + 1
            };
          }
          return c;
        });
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token, currentUser, activeConvId]);

  // 7. Send Outbound Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConvId) return;

    if (token === 'mock_jwt_token_for_preview') {
      const msgText = inputMessage;
      setInputMessage('');
      const newMsg = {
        id: `m_mock_send_${Date.now()}`,
        direction: 'outgoing',
        message_type: 'text',
        content: { body: msgText },
        status: 'sent',
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, newMsg]);
      setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, preview: msgText, last_message_at: 'Ahora' } : c));

      // Simulate a quick AI chatbot response
      if (settings.ai_config?.enabled) {
        setTimeout(() => {
          const aiResponse = `[Chatbot AI] Recibido. Procesaremos su solicitud bajo la directiva: "${settings.ai_config.prompt.substring(0, 30)}..."`;
          const aiMsg = {
            id: `m_mock_ai_${Date.now()}`,
            direction: 'incoming',
            message_type: 'text',
            content: { body: aiResponse },
            status: 'read',
            created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, aiMsg]);
          setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, preview: aiResponse, last_message_at: 'Ahora' } : c));
        }, 1200);
      }
      return;
    }

    try {
      const msgText = inputMessage;
      setInputMessage('');

      const response = await api.post(`/conversations/${activeConvId}/messages`, {
        body: msgText,
        messageType: 'text'
      });

      setMessages(prev => [...prev, response.data]);
      setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, preview: msgText, last_message_at: 'Ahora' } : c));
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Error al enviar mensaje');
    }
  };

  // 8. Update Settings Handler
  const handleSaveSettings = async () => {
    if (token === 'mock_jwt_token_for_preview') {
      alert('Configuración local guardada en memoria.');
      return;
    }

    try {
      await api.post('/settings', { key: 'ycloud_api_key', value: settings.ycloud_api_key });
      await api.post('/settings', { key: 'whatsapp_phone_id', value: settings.whatsapp_phone_id });
      await api.post('/settings', { key: 'ai_config', value: settings.ai_config });
      alert('Configuración guardada correctamente.');
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Error al guardar ajustes.');
    }
  };

  // 9. Pipeline progression click handler
  const handlePipelineProgress = async (contactId, currentStageId) => {
    if (token === 'mock_jwt_token_for_preview') {
      const nextIndex = stages.findIndex(s => s.id === currentStageId) + 1;
      const nextStage = nextIndex < stages.length ? stages[nextIndex] : stages[0];
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, pipeline_stage_id: nextStage.id } : c));
      return;
    }

    try {
      const nextIndex = stages.findIndex(s => s.id === currentStageId) + 1;
      const nextStage = nextIndex < stages.length ? stages[nextIndex] : stages[0];

      await api.put(`/contacts/${contactId}`, {
        pipeline_stage_id: nextStage.id
      });

      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, pipeline_stage_id: nextStage.id } : c));
    } catch (err) {
      console.error('Error transitioning pipeline:', err);
    }
  };

  // 10. Manual contact creation handler
  const handleCreateContact = async () => {
    const name = prompt('Nombre del contacto:');
    const phone = prompt('Teléfono (E.164, ej: +525512345678):');
    if (!name || !phone) return;

    if (token === 'mock_jwt_token_for_preview') {
      const newC = {
        id: `c_${Date.now()}`,
        name,
        phone,
        email: `${name.toLowerCase().replace(' ', '')}@gmail.com`,
        company: 'Nueva Empresa (Mock)',
        notes: 'Contacto agregado manualmente en modo local.',
        pipeline_stage_id: stages[0]?.id || 'stage_1',
        assigned_user_id: 'u_1',
        last_message_at: 'Ahora'
      };
      setContacts(prev => [newC, ...prev]);

      const newConv = {
        id: `conv_${Date.now()}`,
        contact_id: newC.id,
        status: 'open',
        unread_count: 0,
        last_message_at: 'Ahora',
        preview: 'Nueva conversación iniciada'
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      return;
    }

    try {
      const response = await api.post('/contacts', {
        name,
        phone,
        pipelineStageId: stages[0]?.id
      });
      setContacts(prev => [response.data, ...prev]);

      const conversationsRes = await api.get('/conversations?status=open');
      setConversations(conversationsRes.data);
    } catch (err) {
      console.error('Error creating contact:', err);
      alert(err.response?.data?.error || 'Error al crear contacto');
    }
  };

  const getContactInfo = (contactId) => {
    return contacts.find(c => c.id === contactId) || { name: 'Cargando...', phone: '' };
  };

  // If user is not logged in, render the Login Screen
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
        {/* Glow styling backgrounds */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <form onSubmit={handleLogin} className="w-full max-w-md p-8 glass-panel rounded-2xl border border-slate-800 shadow-2xl relative z-10 flex flex-col gap-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center font-bold text-white shadow-xl shadow-emerald-500/20 mx-auto text-xl mb-2">
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

  const activeConv = conversations.find(c => c.id === activeConvId);
  const activeContact = activeConv ? getContactInfo(activeConv.contact_id) : null;
  const activeChatMessages = messages || [];

  return (
    <div className="flex h-screen overflow-hidden text-slate-100 bg-slate-950">
      
      {/* SIDEBAR */}
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
                {token === 'mock_jwt_token_for_preview' ? 'Modo Local' : 'Conectado a API'}
              </span>
            </div>
          </div>

          {/* Org Selector */}
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
              <div className="absolute top-full left-4 right-4 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-30 py-1">
                {organizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setSelectedOrg(org);
                      setOrgDropdownOpen(false);
                      setActiveConvId(null);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-800 transition ${selectedOrg?.id === org.id ? 'text-emerald-400 bg-slate-800/40' : 'text-slate-300'}`}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            )}
          </div>

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
              <span className="text-xs font-semibold block text-slate-200 truncate">{currentUser?.name}</span>
              <span className="text-[9px] block text-slate-400 truncate">{currentUser?.email}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
        
        {/* Glow gradients */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-10 left-1/3 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[140px] pointer-events-none"></div>

        {/* TOP BAR */}
        <header className="h-16 glass-panel border-b border-slate-800 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight capitalize">{
              activeTab === 'inbox' ? 'Bandeja de Entrada' :
              activeTab === 'contacts' ? 'Contactos CRM' :
              activeTab === 'pipelines' ? 'Embudo de Ventas' : 'Ajustes de Organización'
            }</h1>
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
            <div className="flex-1 flex overflow-hidden">
              
              {/* CHAT THREADS LIST */}
              <div className="w-80 border-r border-slate-800/80 flex flex-col bg-slate-950/40">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversaciones</span>
                  <button className="p-1 hover:bg-slate-800 rounded transition text-emerald-400" onClick={handleCreateContact}>
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
                            {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:42 AM'}
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
                        onChange={async (e) => {
                          const updatedVal = e.target.value;
                          if (token === 'mock_jwt_token_for_preview') {
                            setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, status: updatedVal } : c));
                            return;
                          }
                          try {
                            await api.put(`/conversations/${activeConvId}/status`, { status: updatedVal });
                            setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, status: updatedVal } : c));
                          } catch (err) {
                            console.error(err);
                          }
                        }}
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
                    Selecciona un chat
                  </div>
                )}

                {/* Message Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {activeChatMessages.map(msg => {
                    const isOutgoing = msg.direction === 'outgoing';
                    return (
                      <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-md flex flex-col gap-1 ${
                          isOutgoing 
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-slate-100 rounded-br-none border border-emerald-500/10' 
                            : 'bg-slate-800/70 text-slate-100 rounded-bl-none border border-slate-700/50'
                        }`}>
                          <span>{msg.content?.body || msg.content}</span>
                          <div className="flex items-center justify-end gap-1.5 self-end text-[9px] text-slate-300/85 font-mono">
                            <span>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '11:42 AM'}</span>
                            {isOutgoing && (
                              <span>
                                {msg.status === 'read' ? <CheckCheck className="w-3.5 h-3.5 text-sky-400" /> : <Check className="w-3.5 h-3.5 text-slate-400" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chat Footer Input */}
                {activeConvId && (
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900/30 flex items-center gap-3">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Escribe un mensaje de WhatsApp..."
                      className="flex-1 glass-input rounded-xl px-4 py-2.5 text-sm text-slate-200"
                    />
                    <button 
                      type="submit"
                      className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/15 transition flex items-center justify-center shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}

              </div>

              {/* CONTACT CONTEXT DRAWER */}
              {activeContact && activeConv && (
                <div className="w-72 border-l border-slate-800/80 bg-slate-950/40 p-5 flex flex-col justify-between">
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-xl font-bold text-emerald-400 mb-2 shadow-inner">
                        {activeContact.name.substring(0, 2).toUpperCase()}
                      </div>
                      <h3 className="font-bold text-sm text-slate-200">{activeContact.name}</h3>
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
                        <p className="text-xs text-slate-400 bg-slate-900/40 p-2.5 rounded border border-slate-800 leading-relaxed">
                          {activeContact.notes || 'Sin anotaciones.'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Etapa de Pipeline</span>
                        <div className="mt-1">
                          {stages.map(s => {
                            const isCurrent = activeContact.pipeline_stage_id === s.id;
                            return (
                              <button
                                key={s.id}
                                onClick={async () => {
                                  if (token === 'mock_jwt_token_for_preview') {
                                    setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, pipeline_stage_id: s.id } : c));
                                    return;
                                  }
                                  try {
                                    await api.put(`/contacts/${activeContact.id}`, { pipeline_stage_id: s.id });
                                    setContacts(prev => prev.map(c => c.id === activeContact.id ? { ...c, pipeline_stage_id: s.id } : c));
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className={`w-full flex items-center justify-between text-left px-2 py-1 rounded text-xs mb-1 border transition ${
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
          )}

          {/* VIEW: CONTACTS */}
          {activeTab === 'contacts' && (
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-200">Base de Datos de Leads</h2>
                  <p className="text-xs text-slate-400">Administra tus contactos asignados y su estado en el pipeline.</p>
                </div>
                <button 
                  onClick={handleCreateContact}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-emerald-600/10"
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {contacts.map(c => {
                      const stage = stages.find(s => s.id === c.pipeline_stage_id);
                      return (
                        <tr key={c.id} className="hover:bg-slate-900/20 transition">
                          <td className="p-4 font-semibold text-slate-200">{c.name}</td>
                          <td className="p-4 font-mono text-xs text-slate-400">{c.phone}</td>
                          <td className="p-4 text-slate-300">{c.email || '—'}</td>
                          <td className="p-4 text-slate-300">{c.company || '—'}</td>
                          <td className="p-4">
                            <span className="text-[10px] px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                              {stage ? stage.name : 'Sin Etapa'}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-400 truncate max-w-xs">{c.notes || '—'}</td>
                        </tr>
                      );
                    })}
                    {contacts.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500">No hay contactos registrados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW: PIPELINES */}
          {activeTab === 'pipelines' && (
            <div className="flex-1 p-8 flex flex-col overflow-hidden">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-200">Embudo Comercial</h2>
                <p className="text-xs text-slate-400">Visualiza la conversión de tus contactos comerciales. Haz clic en las tarjetas para avanzar en el proceso.</p>
              </div>

              {/* KANBAN BOARD */}
              <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
                {stages.map(stage => {
                  const stageContacts = contacts.filter(c => c.pipeline_stage_id === stage.id);
                  return (
                    <div key={stage.id} className="flex flex-col h-full bg-slate-900/20 border border-slate-800/80 rounded-xl overflow-hidden">
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
                            onClick={() => handlePipelineProgress(c.id, stage.id)}
                            className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-lg hover:border-emerald-500/40 transition cursor-pointer flex flex-col gap-2 group hover:bg-slate-900"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm text-slate-200 group-hover:text-emerald-400 transition">{c.name}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                            <span className="text-xs text-slate-400 truncate block">{c.company || 'Sin Empresa'}</span>
                            <div className="flex items-center justify-between border-t border-slate-800 pt-2 mt-1">
                              <span className="text-[10px] font-mono text-slate-500">{c.phone}</span>
                              <span className="text-[10px] text-slate-400">
                                {c.last_message_at ? (c.last_message_at.includes('M') || c.last_message_at.includes('A') || c.last_message_at.includes('3') ? c.last_message_at : new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'Ayer'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {activeTab === 'settings' && (
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
                        value={settings.ycloud_api_key.apiKey} 
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          ycloud_api_key: { apiKey: e.target.value }
                        }))}
                        className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WhatsApp Phone ID</label>
                      <input 
                        type="text" 
                        value={settings.whatsapp_phone_id.phoneId} 
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          whatsapp_phone_id: { phoneId: e.target.value }
                        }))}
                        className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200"
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
                        checked={settings.ai_config.enabled} 
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          ai_config: { ...prev.ai_config, enabled: e.target.checked }
                        }))}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-slate-100"></div>
                    </label>
                  </div>

                  {settings.ai_config.enabled && (
                    <div className="flex flex-col gap-1.5 mt-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instrucción del Sistema (System Prompt)</label>
                      <textarea
                        rows="4"
                        value={settings.ai_config.prompt}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          ai_config: { ...prev.ai_config, prompt: e.target.value }
                        }))}
                        className="glass-input rounded-lg px-3.5 py-2 text-sm text-slate-200 leading-relaxed font-sans"
                      ></textarea>
                      <span className="text-[10px] text-slate-500">Este prompt controlará las respuestas que genera la inteligencia artificial cuando reciba un mensaje.</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    onClick={handleSaveSettings}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-lg text-sm shadow-lg shadow-emerald-600/10 transition"
                  >
                    Guardar Configuración
                  </button>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>

    </div>
  );
}

export default App;
