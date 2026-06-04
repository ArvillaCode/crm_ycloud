import api from './api';

// In-Memory state for mock preview mode fallback
let mockTags = [
  { id: 'tag_1', name: 'Nuevo', color: '#3B82F6' },
  { id: 'tag_2', name: 'Cliente caliente', color: '#EF4444' },
  { id: 'tag_3', name: 'Membresía', color: '#10B981' },
  { id: 'tag_4', name: 'Seguimiento', color: '#F59E0B' },
  { id: 'tag_5', name: 'Pago pendiente', color: '#EC4899' }
];

let mockContacts = [
  { id: 'c_1', name: 'Alejandro Gómez', phone: '+525512345678', email: 'alejandro@gomez.com', company: 'Inversiones Gómez', notes: 'Interesado en departamento de 2 recámaras en Polanco.', pipeline_stage_id: 'stage_1', assigned_user_id: 'u_1', last_message_at: '2026-06-03T18:42:00.000Z', tags: [{ id: 'tag_1', name: 'Nuevo', color: '#3B82F6' }, { id: 'tag_4', name: 'Seguimiento', color: '#F59E0B' }] },
  { id: 'c_2', name: 'María Rodríguez', phone: '+34612345678', email: 'maria.r@gmail.com', company: 'Freelance Design', notes: 'Preguntó por costos de soporte premium.', pipeline_stage_id: 'stage_2', assigned_user_id: 'u_2', last_message_at: '2026-06-03T17:15:00.000Z', tags: [] },
  { id: 'c_3', name: 'Carlos Mendoza', phone: '+5491198765432', email: 'carlos@mendoza.co', company: 'E-commerce Corp', notes: 'Solicitó demo de la plataforma.', pipeline_stage_id: 'stage_1', assigned_user_id: 'u_1', last_message_at: '2026-06-02T12:00:00.000Z', tags: [{ id: 'tag_2', name: 'Cliente caliente', color: '#EF4444' }] },
  { id: 'c_4', name: 'Laura Martinez', phone: '+56987654321', email: 'laura@martinez.cl', company: 'Minera del Norte', notes: 'Trato cerrado. Pendiente de onboarding.', pipeline_stage_id: 'stage_3', assigned_user_id: 'u_1', last_message_at: '2026-05-30T10:00:00.000Z', tags: [{ id: 'tag_3', name: 'Membresía', color: '#10B981' }] }
];

let mockConversations = [
  { id: 'conv_1', contact_id: 'c_1', status: 'open', unread_count: 2, last_message_at: '2026-06-03T18:42:00.000Z', preview: 'Me gustaría agendar una visita mañana por la tarde' },
  { id: 'conv_2', contact_id: 'c_2', status: 'open', unread_count: 0, last_message_at: '2026-06-03T17:15:00.000Z', preview: 'Muchas gracias por la respuesta' },
  { id: 'conv_3', contact_id: 'c_3', status: 'pending', unread_count: 0, last_message_at: '2026-06-02T12:00:00.000Z', preview: '¿Tienen integración con ERP?' },
  { id: 'conv_4', contact_id: 'c_4', status: 'closed', unread_count: 0, last_message_at: '2026-05-30T10:00:00.000Z', preview: 'Perfecto, quedamos en contacto' }
];

let mockMessages = {
  'conv_1': [
    { id: 'm1', direction: 'incoming', message_type: 'text', content: { body: 'Hola, vi su anuncio del departamento en Polanco.' }, status: 'read', created_at: '2026-06-03T18:30:00.000Z' },
    { id: 'm2', direction: 'outgoing', message_type: 'text', content: { body: '¡Hola! Claro que sí Alejandro. Tenemos unidades disponibles. ¿Qué dudas tienes?' }, status: 'read', created_at: '2026-06-03T18:32:00.000Z' },
    { id: 'm3', direction: 'incoming', message_type: 'text', content: { body: 'Me gustaría agendar una visita mañana por la tarde. ¿Se puede?' }, status: 'read', created_at: '2026-06-03T18:42:00.000Z' }
  ],
  'conv_2': [
    { id: 'm4', direction: 'incoming', message_type: 'text', content: { body: 'Hola, ¿el plan de soporte mensual cubre integraciones personalizadas?' }, status: 'read', created_at: '2026-06-03T17:00:00.000Z' },
    { id: 'm5', direction: 'outgoing', message_type: 'text', content: { body: 'Hola María. El plan Premium sí cubre hasta 5 horas de desarrollo personalizado.' }, status: 'read', created_at: '2026-06-03T17:10:00.000Z' },
    { id: 'm6', direction: 'incoming', message_type: 'text', content: { body: 'Muchas gracias por la respuesta. Lo estaré contratando en la tarde.' }, status: 'read', created_at: '2026-06-03T17:15:00.000Z' }
  ]
};

let mockStages = [
  { id: 'stage_1', name: 'Nuevo Lead', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'stage_2', name: 'En Progreso', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'stage_3', name: 'Cerrado Ganado', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
];

let mockSettings = {
  ycloud_api_key: { apiKey: 'yc_live_59h8s7d8sa9d8as8712' },
  whatsapp_phone_id: { phoneId: '109283748293749' },
  ai_config: { enabled: true, prompt: 'Actúa como un agente de ventas empático. Responde en español, sé directo pero amable.' }
};

const isMock = () => localStorage.getItem('token') === 'mock_jwt_token_for_preview';

export const crmService = {
  // --- AUTH SERVICES ---
  async getOrganizations() {
    if (isMock()) {
      return [
        { id: '1615f5c8-12cd-44c1-9038-f1c5d98e821b', name: 'Inmobiliaria Sol S.A.' },
        { id: '2615f5c8-12cd-44c1-9038-f1c5d98e821b', name: 'TechSolutions SpA' },
        { id: '3615f5c8-12cd-44c1-9038-f1c5d98e821b', name: 'Gym Fitness Club' }
      ];
    }
    const response = await api.get('/auth/organizations');
    return response.data;
  },

  async login(email, password, organizationId) {
    const response = await api.post('/auth/login', { email, password, organizationId });
    return response.data;
  },

  async logout() {
    if (isMock()) return;
    await api.post('/auth/logout');
  },

  // --- CONTACTS SERVICES ---
  async getContacts() {
    if (isMock()) return [...mockContacts];
    const response = await api.get('/contacts');
    return response.data;
  },

  async createContact(contactData) {
    if (isMock()) {
      const contactTags = (contactData.tagIds || []).map(id => mockTags.find(t => t.id === id)).filter(Boolean);
      const newContact = {
        id: `c_${Date.now()}`,
        name: contactData.name,
        phone: contactData.phone,
        email: contactData.email || '',
        company: contactData.company || '',
        notes: contactData.notes || '',
        pipeline_stage_id: contactData.pipelineStageId || mockStages[0].id,
        assigned_user_id: contactData.assignedUserId || 'u_1',
        last_message_at: new Date().toISOString(),
        tags: contactTags
      };
      mockContacts.unshift(newContact);
      return newContact;
    }
    const response = await api.post('/contacts', contactData);
    return response.data;
  },

  async updateContact(contactId, contactData) {
    if (isMock()) {
      let contactTags = undefined;
      if (contactData.tagIds !== undefined) {
        contactTags = (contactData.tagIds || []).map(id => mockTags.find(t => t.id === id)).filter(Boolean);
      }

      mockContacts = mockContacts.map(c => 
        c.id === contactId 
          ? { 
              ...c, 
              ...contactData, 
              pipeline_stage_id: contactData.pipelineStageId !== undefined ? contactData.pipelineStageId : (contactData.pipeline_stage_id !== undefined ? contactData.pipeline_stage_id : c.pipeline_stage_id),
              assigned_user_id: contactData.assignedUserId !== undefined ? contactData.assignedUserId : (contactData.assigned_user_id !== undefined ? contactData.assigned_user_id : c.assigned_user_id),
              tags: contactTags !== undefined ? contactTags : c.tags
            } 
          : c
      );
      return mockContacts.find(c => c.id === contactId);
    }
    const response = await api.put(`/contacts/${contactId}`, contactData);
    return response.data;
  },

  async deleteContact(contactId) {
    if (isMock()) {
      mockContacts = mockContacts.filter(c => c.id !== contactId);
      mockConversations = mockConversations.filter(c => c.contact_id !== contactId);
      return { success: true };
    }
    const response = await api.delete(`/contacts/${contactId}`);
    return response.data;
  },

  // --- CONVERSATIONS SERVICES ---
  async getConversations(status = 'open') {
    if (isMock()) {
      return mockConversations.filter(c => c.status === status);
    }
    const response = await api.get(`/conversations?status=${status}`);
    return response.data;
  },

  async createConversation(contactId) {
    if (isMock()) {
      let existing = mockConversations.find(c => c.contact_id === contactId && c.status === 'open');
      if (existing) return existing;

      const newConv = {
        id: `conv_${Date.now()}`,
        contact_id: contactId,
        status: 'open',
        unread_count: 0,
        last_message_at: new Date().toISOString(),
        preview: 'Nueva conversación iniciada'
      };
      mockConversations.unshift(newConv);
      return newConv;
    }
    const response = await api.post('/conversations', { contactId });
    return response.data;
  },

  async updateConversationStatus(conversationId, status) {
    if (isMock()) {
      mockConversations = mockConversations.map(c => 
        c.id === conversationId ? { ...c, status } : c
      );
      return mockConversations.find(c => c.id === conversationId);
    }
    const response = await api.put(`/conversations/${conversationId}/status`, { status });
    return response.data;
  },

  // --- MESSAGES SERVICES ---
  async getMessages(conversationId) {
    if (isMock()) {
      return mockMessages[conversationId] || [];
    }
    const response = await api.get(`/conversations/${conversationId}/messages`);
    return response.data;
  },

  async sendMessage(conversationId, body, messageType = 'text', isInternal = false) {
    if (isMock()) {
      const newMsg = {
        id: `m_mock_${Date.now()}`,
        direction: isInternal ? 'internal' : 'outgoing',
        message_type: messageType,
        content: { body },
        status: isInternal ? 'delivered' : 'sent',
        created_at: new Date().toISOString()
      };
      
      if (!mockMessages[conversationId]) {
        mockMessages[conversationId] = [];
      }
      mockMessages[conversationId].push(newMsg);

      mockConversations = mockConversations.map(c => 
        c.id === conversationId 
          ? { ...c, preview: body, last_message_at: new Date().toISOString() } 
          : c
      );

      return newMsg;
    }
    const response = await api.post(`/conversations/${conversationId}/messages`, {
      body,
      messageType,
      isInternal
    });
    return response.data;
  },

  // --- SETTINGS SERVICES ---
  async getSettings() {
    if (isMock()) return { ...mockSettings };
    const response = await api.get('/settings');
    return response.data;
  },

  async saveSettings(key, value) {
    if (isMock()) {
      mockSettings[key] = value;
      return { success: true };
    }
    const response = await api.post('/settings', { key, value });
    return response.data;
  },

  // --- PIPELINES SERVICES ---
  async getPipelines() {
    if (isMock()) {
      return [{ id: 'p_1', name: 'Embudo Principal' }];
    }
    const response = await api.get('/pipelines');
    return response.data;
  },

  async getPipelineStages(pipelineId) {
    if (isMock()) return [...mockStages];
    const response = await api.get(`/pipelines/${pipelineId}/stages`);
    return response.data;
  },

  // --- TAGS SERVICES ---
  async getTags() {
    if (isMock()) return [...mockTags];
    const response = await api.get('/tags');
    return response.data;
  },

  async createTag(tagData) {
    if (isMock()) {
      const newTag = {
        id: `tag_${Date.now()}`,
        name: tagData.name,
        color: tagData.color || '#E2E8F0'
      };
      mockTags.push(newTag);
      return newTag;
    }
    const response = await api.post('/tags', tagData);
    return response.data;
  },

  async updateTag(tagId, tagData) {
    if (isMock()) {
      mockTags = mockTags.map(t => t.id === tagId ? { ...t, ...tagData } : t);
      mockContacts = mockContacts.map(c => ({
        ...c,
        tags: c.tags.map(t => t.id === tagId ? { ...t, ...tagData } : t)
      }));
      return mockTags.find(t => t.id === tagId);
    }
    const response = await api.put(`/tags/${tagId}`, tagData);
    return response.data;
  },

  async deleteTag(tagId) {
    if (isMock()) {
      mockTags = mockTags.filter(t => t.id !== tagId);
      mockContacts = mockContacts.map(c => ({
        ...c,
        tags: c.tags.filter(t => t.id !== tagId)
      }));
      return { success: true };
    }
    const response = await api.delete(`/tags/${tagId}`);
    return response.data;
  },

  async assignTagToContact(contactId, tagId) {
    if (isMock()) {
      const tag = mockTags.find(t => t.id === tagId);
      if (!tag) throw new Error('Tag not found');
      mockContacts = mockContacts.map(c => {
        if (c.id === contactId) {
          const tags = c.tags.some(t => t.id === tagId) ? c.tags : [...c.tags, tag];
          return { ...c, tags };
        }
        return c;
      });
      return mockContacts.find(c => c.id === contactId);
    }
    const response = await api.post(`/contacts/${contactId}/tags`, { tagId });
    return response.data;
  },

  async unassignTagFromContact(contactId, tagId) {
    if (isMock()) {
      mockContacts = mockContacts.map(c => {
        if (c.id === contactId) {
          const tags = c.tags.filter(t => t.id !== tagId);
          return { ...c, tags };
        }
        return c;
      });
      return mockContacts.find(c => c.id === contactId);
    }
    const response = await api.delete(`/contacts/${contactId}/tags/${tagId}`);
    return response.data;
  }
};

export default crmService;
