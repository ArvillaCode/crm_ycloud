require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Helper Functions for Idempotency
async function ensureOrganization(name) {
  const select = await db.query('SELECT id FROM organizations WHERE name = $1', [name]);
  if (select.rows.length > 0) return select.rows[0].id;
  
  const insert = await db.query('INSERT INTO organizations (name) VALUES ($1) RETURNING id', [name]);
  console.log(`[Seeder] Created organization: ${name}`);
  return insert.rows[0].id;
}

async function ensureUser({ organizationId, name, email, password, role }) {
  const select = await db.query('SELECT id FROM users WHERE email = $1 AND organization_id = $2', [email, organizationId]);
  if (select.rows.length > 0) return select.rows[0].id;

  const passwordHash = await bcrypt.hash(password, 10);
  const insert = await db.query(
    'INSERT INTO users (organization_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [organizationId, name, email, passwordHash, role]
  );
  console.log(`[Seeder] Created user: ${name} (${email})`);
  return insert.rows[0].id;
}

async function ensurePipeline(organizationId, name) {
  const select = await db.query('SELECT id FROM pipelines WHERE name = $1 AND organization_id = $2', [name, organizationId]);
  if (select.rows.length > 0) return select.rows[0].id;

  const insert = await db.query(
    'INSERT INTO pipelines (organization_id, name) VALUES ($1, $2) RETURNING id',
    [organizationId, name]
  );
  console.log(`[Seeder] Created pipeline: ${name}`);
  return insert.rows[0].id;
}

async function ensurePipelineStage(pipelineId, name, orderIndex) {
  const select = await db.query('SELECT id FROM pipeline_stages WHERE name = $1 AND pipeline_id = $2', [name, pipelineId]);
  if (select.rows.length > 0) return select.rows[0].id;

  const insert = await db.query(
    'INSERT INTO pipeline_stages (pipeline_id, name, order_index) VALUES ($1, $2, $3) RETURNING id',
    [pipelineId, name, orderIndex]
  );
  console.log(`[Seeder] Created stage: ${name}`);
  return insert.rows[0].id;
}

async function ensureSetting(organizationId, key, value) {
  const select = await db.query('SELECT id FROM settings WHERE key = $1 AND organization_id = $2', [key, organizationId]);
  if (select.rows.length > 0) return select.rows[0].id;

  const insert = await db.query(
    'INSERT INTO settings (organization_id, key, value) VALUES ($1, $2, $3::jsonb) RETURNING id',
    [organizationId, key, JSON.stringify(value)]
  );
  console.log(`[Seeder] Created setting: ${key}`);
  return insert.rows[0].id;
}

async function ensureTag(organizationId, name, color) {
  const select = await db.query('SELECT id FROM labels WHERE name = $1 AND organization_id = $2', [name, organizationId]);
  if (select.rows.length > 0) return select.rows[0].id;

  const insert = await db.query(
    'INSERT INTO labels (organization_id, name, color) VALUES ($1, $2, $3) RETURNING id',
    [organizationId, name, color]
  );
  console.log(`[Seeder] Created tag: ${name}`);
  return insert.rows[0].id;
}

async function ensureContact({ organizationId, name, phone, email, company, notes, pipelineStageId, assignedUserId, tagIds = [] }) {
  const select = await db.query('SELECT id FROM contacts WHERE phone = $1 AND organization_id = $2 AND deleted_at IS NULL', [phone, organizationId]);
  let contactId;
  if (select.rows.length > 0) {
    contactId = select.rows[0].id;
  } else {
    const insert = await db.query(`
      INSERT INTO contacts (organization_id, name, phone, email, company, notes, pipeline_stage_id, assigned_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [organizationId, name, phone, email, company, notes, pipelineStageId, assignedUserId]);
    contactId = insert.rows[0].id;
    console.log(`[Seeder] Created contact: ${name}`);
  }

  // Sync tags
  if (tagIds && tagIds.length > 0) {
    for (const tagId of tagIds) {
      await db.query(`
        INSERT INTO contact_labels (contact_id, label_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [contactId, tagId]);
    }
  }

  return contactId;
}

async function ensureConversation(organizationId, contactId) {
  const select = await db.query('SELECT id FROM conversations WHERE contact_id = $1 AND organization_id = $2 AND deleted_at IS NULL', [contactId, organizationId]);
  if (select.rows.length > 0) return select.rows[0].id;

  const insert = await db.query(
    'INSERT INTO conversations (organization_id, contact_id, status) VALUES ($1, $2, \'open\') RETURNING id',
    [organizationId, contactId]
  );
  console.log(`[Seeder] Created conversation for contact ID: ${contactId}`);
  return insert.rows[0].id;
}

async function ensureMessage(conversationId, whatsappMessageId, direction, messageType, content, status, offsetMinutes) {
  const select = await db.query('SELECT id FROM messages WHERE whatsapp_message_id = $1', [whatsappMessageId]);
  if (select.rows.length > 0) return select.rows[0].id;

  const createdAt = new Date(Date.now() - offsetMinutes * 60 * 1000).toISOString();
  const insert = await db.query(`
    INSERT INTO messages (conversation_id, whatsapp_message_id, direction, message_type, content, status, created_at)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
    RETURNING id
  `, [conversationId, whatsappMessageId, direction, messageType, JSON.stringify(content), status, createdAt]);
  return insert.rows[0].id;
}

async function seed() {
  console.log('[Seeder] Starting database seeding process...');

  try {
    // 1. Reset tables if reset flag is true
    const reset = process.env.SEED_RESET === 'true';
    if (reset) {
      console.log('[Seeder] SEED_RESET=true. Cleaning all database tables...');
      await db.query(`
        TRUNCATE TABLE 
          organizations, 
          users, 
          pipelines, 
          pipeline_stages, 
          contacts, 
          labels, 
          contact_labels, 
          conversations, 
          messages, 
          settings, 
          whatsapp_accounts, 
          message_attachments, 
          audit_logs 
        CASCADE
      `);
      console.log('[Seeder] Truncated tables successfully.');
    } else {
      console.log('[Seeder] Running in safe, idempotent mode. Existing records will be preserved.');
    }

    // 2. Ensure Organizations exist
    const solOrgId = await ensureOrganization('Inmobiliaria Sol S.A.');
    const techOrgId = await ensureOrganization('TechSolutions SpA');
    const gymOrgId = await ensureOrganization('Gym Fitness Club');

    // 3. Ensure Users exist
    const carlosId = await ensureUser({
      organizationId: solOrgId,
      name: 'Carlos Agente',
      email: 'carlos@company.com',
      password: 'carlos123',
      role: 'agent'
    });

    const solAdminId = await ensureUser({
      organizationId: solOrgId,
      name: 'Admin General',
      email: 'admin@company.com',
      password: 'admin123',
      role: 'admin'
    });

    // Fetch secure staging password or fallback
    const gymPassword = process.env.SEED_ADMIN_PASSWORD || 'GymAdmin2026!';
    const gymAdminId = await ensureUser({
      organizationId: gymOrgId,
      name: 'Admin Gym',
      email: 'admin@company.com',
      password: gymPassword,
      role: 'admin'
    });

    // ==========================================
    // SEEDING DATA FOR INMOBILIARIA SOL S.A.
    // ==========================================
    console.log('[Seeder] Seeding Inmobiliaria Sol S.A. metadata...');
    const solPipelineId = await ensurePipeline(solOrgId, 'Pipeline de Ventas');
    const solStageNuevo = await ensurePipelineStage(solPipelineId, 'Nuevo Lead', 0);
    const solStageProgreso = await ensurePipelineStage(solPipelineId, 'En Progreso', 1);
    const solStageCerrado = await ensurePipelineStage(solPipelineId, 'Cerrado Ganado', 2);

    await ensureSetting(solOrgId, 'ycloud_api_key', { apiKey: 'yc_live_59h8s7d8sa9d8as8712' });
    await ensureSetting(solOrgId, 'whatsapp_phone_id', { phoneId: '109283748293749' });
    await ensureSetting(solOrgId, 'ai_config', { enabled: true, prompt: 'Actúa como un agente de ventas empático. Responde en español, sé directo pero amable.' });

    const tagInmNuevo = await ensureTag(solOrgId, 'Nuevo', '#3B82F6');
    const tagInmInteresado = await ensureTag(solOrgId, 'Interesado', '#F59E0B');

    // Contacts & Messages for Sol S.A.
    const cAlejandro = await ensureContact({
      organizationId: solOrgId,
      name: 'Alejandro Gómez',
      phone: '+525512345678',
      email: 'alejandro@gomez.com',
      company: 'Inversiones Gómez',
      notes: 'Interesado en departamento de 2 recámaras en Polanco.',
      pipelineStageId: solStageNuevo,
      assignedUserId: solAdminId,
      tagIds: [tagInmNuevo, tagInmInteresado]
    });

    const convAlejandro = await ensureConversation(solOrgId, cAlejandro);
    await ensureMessage(convAlejandro, 'wamid.sol_1', 'incoming', 'text', { body: 'Hola, vi su anuncio del departamento en Polanco.' }, 'read', 30);
    await ensureMessage(convAlejandro, 'wamid.sol_2', 'outgoing', 'text', { body: '¡Hola! Claro que sí Alejandro. Tenemos unidades disponibles. ¿Qué dudas tienes?' }, 'read', 28);
    await ensureMessage(convAlejandro, 'wamid.sol_3', 'incoming', 'text', { body: 'Me gustaría agendar una visita mañana por la tarde. ¿Se puede?' }, 'read', 15);


    // ==========================================
    // SEEDING DATA FOR GYM FITNESS CLUB
    // ==========================================
    console.log('[Seeder] Seeding Gym Fitness Club metadata...');
    const gymPipelineId = await ensurePipeline(gymOrgId, 'Embudo Gym');
    const gymStageNuevo = await ensurePipelineStage(gymPipelineId, 'Nuevo Lead', 0);
    const gymStageContactado = await ensurePipelineStage(gymPipelineId, 'Contactado', 1);
    const gymStageCalificado = await ensurePipelineStage(gymPipelineId, 'Calificado', 2);
    const gymStagePago = await ensurePipelineStage(gymPipelineId, 'Pago Pendiente', 3);
    const gymStageMembresia = await ensurePipelineStage(gymPipelineId, 'Membresía Activa', 4);

    await ensureSetting(gymOrgId, 'ycloud_api_key', { apiKey: 'test' });
    await ensureSetting(gymOrgId, 'whatsapp_phone_id', { phoneId: 'test' });
    await ensureSetting(gymOrgId, 'ai_config', { enabled: true, prompt: 'Actúa como un recepcionista comercial del gimnasio. Invita a las personas a entrenar.' });

    // Seed custom gym tags
    const tagGymNuevo = await ensureTag(gymOrgId, 'Nuevo', '#3B82F6');
    const tagGymCaliente = await ensureTag(gymOrgId, 'Cliente caliente', '#EF4444');
    const tagGymMembresia = await ensureTag(gymOrgId, 'Membresía', '#10B981');
    const tagGymSeguimiento = await ensureTag(gymOrgId, 'Seguimiento', '#F59E0B');
    const tagGymPago = await ensureTag(gymOrgId, 'Pago pendiente', '#EC4899');

    // Contacts for Gym Fitness Club
    // Contact 1 (Nuevo)
    const cJuan = await ensureContact({
      organizationId: gymOrgId,
      name: 'Juan Pérez',
      phone: '+573001111111',
      email: 'juan@gmail.com',
      company: 'Pérez Ltda',
      notes: 'Interesado en planes corporativos de entrenamiento.',
      pipelineStageId: gymStageNuevo,
      assignedUserId: gymAdminId,
      tagIds: [tagGymNuevo, tagGymSeguimiento]
    });
    const convJuan = await ensureConversation(gymOrgId, cJuan);
    await ensureMessage(convJuan, 'wamid.gym_juan_1', 'incoming', 'text', { body: 'Hola, quiero preguntar por el costo de la mensualidad en la sede de Chapinero.' }, 'read', 20);
    await ensureMessage(convJuan, 'wamid.gym_juan_2', 'outgoing', 'text', { body: '¡Hola Juan! Un gusto saludarte. La mensualidad en Chapinero está en $120.000 COP. ¿Te gustaría agendar una clase de cortesía?' }, 'read', 18);
    await ensureMessage(convJuan, 'wamid.gym_juan_3', 'incoming', 'text', { body: 'Sí, por favor, me interesaría para mañana en la tarde.' }, 'read', 15);

    // Contact 2 (Contactado)
    const cDiana = await ensureContact({
      organizationId: gymOrgId,
      name: 'Diana Gómez',
      phone: '+573002222222',
      email: 'diana.gomez@hotmail.com',
      company: 'Independiente',
      notes: 'Preguntó por la promoción de parejas en recepción.',
      pipelineStageId: gymStageContactado,
      assignedUserId: gymAdminId,
      tagIds: [tagGymCaliente, tagGymSeguimiento]
    });
    const convDiana = await ensureConversation(gymOrgId, cDiana);
    await ensureMessage(convDiana, 'wamid.gym_diana_1', 'incoming', 'text', { body: 'Hola, me hablaron de la promoción de pareja, ¿sigue vigente?' }, 'read', 120);
    await ensureMessage(convDiana, 'wamid.gym_diana_2', 'outgoing', 'text', { body: '¡Hola Diana! Sí, la promo de pareja sigue activa este mes: 2 x $180.000 COP.' }, 'read', 60);

    // Contact 3 (Pago Pendiente)
    const cMateo = await ensureContact({
      organizationId: gymOrgId,
      name: 'Mateo Restrepo',
      phone: '+573003333333',
      email: 'mateo.res@gmail.com',
      company: 'SURA',
      notes: 'Transferencia realizada pendiente de verificación por administración.',
      pipelineStageId: gymStagePago,
      assignedUserId: gymAdminId,
      tagIds: [tagGymMembresia, tagGymPago]
    });
    const convMateo = await ensureConversation(gymOrgId, cMateo);
    await ensureMessage(convMateo, 'wamid.gym_mateo_1', 'incoming', 'text', { body: 'Hola, se me venció la membresía ayer, ¿puedo transferir para renovar?' }, 'read', 1440);
    await ensureMessage(convMateo, 'wamid.gym_mateo_2', 'outgoing', 'text', { body: 'Hola Mateo, claro que sí. Puedes transferir a nuestra cuenta de ahorros Bancolombia No. 123-456789-01.' }, 'read', 1200);
    await ensureMessage(convMateo, 'wamid.gym_mateo_3', 'incoming', 'text', { body: 'Listo, ya hice la transferencia. ¿Me activan porfa?' }, 'read', 1140);

    // Contact 4 (Membresía Activa - no stage in pipeline test)
    const cCamila = await ensureContact({
      organizationId: gymOrgId,
      name: 'Camila Herrera',
      phone: '+573004444444',
      email: 'camila.her@outlook.com',
      company: 'Bancolombia',
      notes: 'Plan anual contratado. Acude regularmente.',
      pipelineStageId: gymStageMembresia,
      assignedUserId: gymAdminId,
      tagIds: [tagGymMembresia]
    });
    const convCamila = await ensureConversation(gymOrgId, cCamila);
    await ensureMessage(convCamila, 'wamid.gym_camila_1', 'incoming', 'text', { body: 'Hola, ¿a qué hora abre el gimnasio los festivos?' }, 'read', 5760);
    await ensureMessage(convCamila, 'wamid.gym_camila_2', 'outgoing', 'text', { body: 'Hola Camila. Los días festivos abrimos de 8:00 AM a 2:00 PM.' }, 'read', 5700);

    // Contact 5 (Un-staged Virtual Column test contact)
    await ensureContact({
      organizationId: gymOrgId,
      name: 'Nelson Valenzuela (Sin Etapa)',
      phone: '+573005555555',
      email: 'nelson@valenzuela.co',
      company: 'FitCorp',
      notes: 'Contacto directo de whatsapp. No se le ha asignado etapa de ventas.',
      pipelineStageId: null,
      assignedUserId: gymAdminId,
      tagIds: [tagGymNuevo]
    });

    console.log('[Seeder] Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Seeding process failed:', error);
    process.exit(1);
  }
}

seed();
