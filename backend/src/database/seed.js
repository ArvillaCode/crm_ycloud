const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('[Seeder] Starting database seeding...');
  
  try {
    // 1. Clean existing tables (using CASCADE to clean child tables)
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
    console.log('[Seeder] Cleaned all tables successfully.');

    // 2. Insert Organizations
    const orgsRes = await db.query(`
      INSERT INTO organizations (name) VALUES 
      ('Inmobiliaria Sol S.A.'),
      ('TechSolutions SpA'),
      ('Gym Fitness Club')
      RETURNING id, name
    `);
    const orgs = orgsRes.rows;
    console.log(`[Seeder] Seeded ${orgs.length} organizations.`);

    const primaryOrgId = orgs[0].id; // Inmobiliaria Sol S.A.

    // 3. Hash passwords and insert Users
    const agentHash = await bcrypt.hash('carlos123', 10);
    const adminHash = await bcrypt.hash('admin123', 10);
    const gymAdminHash = await bcrypt.hash('GymAdmin2026!', 10);

    const gymOrgId = orgs[2].id; // Gym Fitness Club

    const usersRes = await db.query(`
      INSERT INTO users (organization_id, name, email, password_hash, role) VALUES
      ($1, 'Carlos Agente', 'carlos@company.com', $2, 'agent'),
      ($1, 'Admin General', 'admin@company.com', $3, 'admin'),
      ($4, 'Admin Gym', 'admin@company.com', $5, 'admin')
      RETURNING id, name, role
    `, [primaryOrgId, agentHash, adminHash, gymOrgId, gymAdminHash]);
    const users = usersRes.rows;
    console.log(`[Seeder] Seeded ${users.length} users.`);

    const agentUserId = users[0].id;

    // 4. Insert Pipelines
    const pipelineRes = await db.query(`
      INSERT INTO pipelines (organization_id, name) VALUES
      ($1, 'Pipeline de Ventas')
      RETURNING id, name
    `, [primaryOrgId]);
    const pipelineId = pipelineRes.rows[0].id;
    console.log('[Seeder] Seeded pipeline.');

    // 5. Insert Stages
    const stagesRes = await db.query(`
      INSERT INTO pipeline_stages (pipeline_id, name, order_index) VALUES
      ($1, 'Nuevo Lead', 0),
      ($1, 'En Progreso', 1),
      ($1, 'Cerrado Ganado', 2)
      RETURNING id, name
    `, [pipelineId]);
    const stages = stagesRes.rows;
    console.log(`[Seeder] Seeded ${stages.length} pipeline stages.`);

    const stageNuevo = stages[0].id;
    const stageProgreso = stages[1].id;
    const stageCerrado = stages[2].id;

    // 6. Insert Settings
    await db.query(`
      INSERT INTO settings (organization_id, key, value) VALUES
      ($1, 'ycloud_api_key', '{"apiKey": "yc_live_59h8s7d8sa9d8as8712"}'::jsonb),
      ($1, 'whatsapp_phone_id', '{"phoneId": "109283748293749"}'::jsonb),
      ($1, 'ai_config', '{"enabled": true, "prompt": "Actúa como un agente de ventas empático. Responde en español, sé directo pero amable."}'::jsonb)
    `, [primaryOrgId]);
    console.log('[Seeder] Seeded settings.');

    // 7. Insert Contacts
    const contactRes = await db.query(`
      INSERT INTO contacts (organization_id, name, phone, email, company, notes, pipeline_stage_id, assigned_user_id, last_message_at) VALUES
      ($1, 'Alejandro Gómez', '+525512345678', 'alejandro@gomez.com', 'Inversiones Gómez', 'Interesado en departamento de 2 recámaras en Polanco.', $2, $3, NOW() - INTERVAL '15 minutes'),
      ($1, 'María Rodríguez', '+34612345678', 'maria.r@gmail.com', 'Freelance Design', 'Preguntó por costos de soporte premium.', $4, $3, NOW() - INTERVAL '2 hours'),
      ($1, 'Carlos Mendoza', '+5491198765432', 'carlos@mendoza.co', 'E-commerce Corp', 'Solicitó demo de la plataforma.', $2, $3, NOW() - INTERVAL '1 day'),
      ($1, 'Laura Martinez', '+56987654321', 'laura@martinez.cl', 'Minera del Norte', 'Trato cerrado. Pendiente de onboarding.', $5, $3, NOW() - INTERVAL '4 days')
      RETURNING id, name
    `, [primaryOrgId, stageNuevo, agentUserId, stageProgreso, stageCerrado]);
    const contacts = contactRes.rows;
    console.log(`[Seeder] Seeded ${contacts.length} contacts.`);

    const cAlejandro = contacts[0].id;
    const cMaria = contacts[1].id;
    const cCarlos = contacts[2].id;
    const cLaura = contacts[3].id;

    // 8. Insert Conversations
    const convsRes = await db.query(`
      INSERT INTO conversations (organization_id, contact_id, status, unread_count, last_message_at) VALUES
      ($1, $2, 'open', 2, NOW() - INTERVAL '15 minutes'),
      ($1, $3, 'open', 0, NOW() - INTERVAL '2 hours'),
      ($1, $4, 'pending', 0, NOW() - INTERVAL '1 day'),
      ($1, $5, 'closed', 0, NOW() - INTERVAL '4 days')
      RETURNING id, contact_id
    `, [primaryOrgId, cAlejandro, cMaria, cCarlos, cLaura]);
    const convs = convsRes.rows;
    console.log(`[Seeder] Seeded ${convs.length} conversations.`);

    const convAlejandro = convs.find(c => c.contact_id === cAlejandro).id;
    const convMaria = convs.find(c => c.contact_id === cMaria).id;

    // 9. Insert Messages
    // Alejandro messages
    await db.query(`
      INSERT INTO messages (conversation_id, whatsapp_message_id, direction, message_type, content, status, created_at) VALUES
      ($1, 'wamid.mock_1', 'incoming', 'text', '{"body": "Hola, vi su anuncio del departamento en Polanco."}'::jsonb, 'read', NOW() - INTERVAL '30 minutes'),
      ($1, 'wamid.mock_2', 'outgoing', 'text', '{"body": "¡Hola! Claro que sí Alejandro. Tenemos unidades disponibles. ¿Qué dudas tienes?"}'::jsonb, 'read', NOW() - INTERVAL '28 minutes'),
      ($1, 'wamid.mock_3', 'incoming', 'text', '{"body": "Me gustaría agendar una visita mañana por la tarde. ¿Se puede?"}'::jsonb, 'read', NOW() - INTERVAL '15 minutes')
    `, [convAlejandro]);

    // Maria messages
    await db.query(`
      INSERT INTO messages (conversation_id, whatsapp_message_id, direction, message_type, content, status, created_at) VALUES
      ($1, 'wamid.mock_4', 'incoming', 'text', '{"body": "Hola, ¿el plan de soporte mensual cubre integraciones personalizadas?"}'::jsonb, 'read', NOW() - INTERVAL '2 hours' - INTERVAL '15 minutes'),
      ($1, 'wamid.mock_5', 'outgoing', 'text', '{"body": "Hola María. El plan Premium sí cubre hasta 5 horas de desarrollo personalizado."}'::jsonb, 'read', NOW() - INTERVAL '2 hours' - INTERVAL '5 minutes'),
      ($1, 'wamid.mock_6', 'incoming', 'text', '{"body": "Muchas gracias por la respuesta. Lo estaré contratando en la tarde."}'::jsonb, 'read', NOW() - INTERVAL '2 hours')
    `, [convMaria]);

    console.log('[Seeder] Seeded chat messages.');
    console.log('[Seeder] Database seeding finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Failed to seed database:', error);
    process.exit(1);
  }
}

seed();
