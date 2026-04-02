import 'dotenv/config';
import * as path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as bcrypt from 'bcrypt';
import {
  companies,
  companySchedules,
  companyChannels,
  adminUsers,
  operators,
  teams,
  operatorTeams,
} from '@chatbox/db-schema';
import { eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Load .env from the monorepo root if not already set
// ---------------------------------------------------------------------------

if (!process.env.DATABASE_URL) {
  const rootEnvPath = path.resolve(__dirname, '../../../../.env');
  if (fs.existsSync(rootEnvPath)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('dotenv').config({ path: rootEnvPath });
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEMO_COMPANY_NAME = 'ChatBox Demo';
const DEMO_COMPANY_SLUG = 'chatbox-demo';

const ADMIN_EMAIL = 'admin@chatbox.local';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'System Admin';
const ADMIN_ROLE = 'super_admin';

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is not set. Aborting seed.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema: { companies, companySchedules, companyChannels, adminUsers, operators, teams, operatorTeams } });

  try {
    // ── 1. Create tables if they don't exist ──────────────────────────────
    console.log('Ensuring tables exist...');
    const sqlPath = path.resolve(__dirname, 'create-tables.sql');
    const createTablesSql = fs.readFileSync(sqlPath, 'utf-8');
    await pool.query(createTablesSql);
    console.log('  Tables ready.');

    // ── 2. Seed default company ───────────────────────────────────────────
    console.log('Seeding default company...');

    const existingCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.slug, DEMO_COMPANY_SLUG))
      .limit(1);

    let companyId: string;

    if (existingCompany.length > 0) {
      companyId = existingCompany[0].id;
      console.log(`  Company "${DEMO_COMPANY_NAME}" already exists (id: ${companyId}).`);
    } else {
      const [newCompany] = await db
        .insert(companies)
        .values({
          name: DEMO_COMPANY_NAME,
          slug: DEMO_COMPANY_SLUG,
          default_language: 'en',
          timezone: 'UTC',
          plan: 'free',
          max_operators: 5,
          settings: {},
          active: true,
        })
        .returning();

      companyId = newCompany.id;
      console.log(`  Created company "${DEMO_COMPANY_NAME}" (id: ${companyId}).`);
    }

    // ── 3. Seed default schedules (Mon-Fri 9-18, Sat-Sun closed) ─────────
    console.log('Seeding default schedules...');

    const existingSchedules = await db
      .select()
      .from(companySchedules)
      .where(eq(companySchedules.company_id, companyId));

    if (existingSchedules.length > 0) {
      console.log(`  Schedules already exist (${existingSchedules.length} entries). Skipping.`);
    } else {
      const scheduleRows = [
        { company_id: companyId, day_of_week: 0, open_time: '00:00', close_time: '00:00', is_closed: true },  // Sunday
        { company_id: companyId, day_of_week: 1, open_time: '09:00', close_time: '18:00', is_closed: false }, // Monday
        { company_id: companyId, day_of_week: 2, open_time: '09:00', close_time: '18:00', is_closed: false }, // Tuesday
        { company_id: companyId, day_of_week: 3, open_time: '09:00', close_time: '18:00', is_closed: false }, // Wednesday
        { company_id: companyId, day_of_week: 4, open_time: '09:00', close_time: '18:00', is_closed: false }, // Thursday
        { company_id: companyId, day_of_week: 5, open_time: '09:00', close_time: '18:00', is_closed: false }, // Friday
        { company_id: companyId, day_of_week: 6, open_time: '00:00', close_time: '00:00', is_closed: true },  // Saturday
      ];

      await db.insert(companySchedules).values(scheduleRows);
      console.log('  Created 7 schedule entries (Mon-Fri 09:00-18:00, Sat-Sun closed).');
    }

    // ── 4. Seed default web_chat channel ──────────────────────────────────
    console.log('Seeding default channel...');

    const existingChannels = await db
      .select()
      .from(companyChannels)
      .where(eq(companyChannels.company_id, companyId));

    if (existingChannels.length > 0) {
      console.log(`  Channels already exist (${existingChannels.length} entries). Skipping.`);
    } else {
      await db.insert(companyChannels).values({
        company_id: companyId,
        channel_type: 'web_chat',
        enabled: true,
        credentials: {},
        settings: {},
      });
      console.log('  Created default web_chat channel.');
    }

    // ── 5. Seed super_admin user ──────────────────────────────────────────
    console.log('Seeding super_admin user...');

    const existingAdmin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, ADMIN_EMAIL))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log(`  Admin user "${ADMIN_EMAIL}" already exists. Skipping.`);
    } else {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

      const [newAdmin] = await db
        .insert(adminUsers)
        .values({
          company_id: companyId,
          email: ADMIN_EMAIL,
          name: ADMIN_NAME,
          password_hash: passwordHash,
          role: ADMIN_ROLE,
          active: true,
        })
        .returning();

      console.log(`  Created super_admin "${ADMIN_EMAIL}" (id: ${newAdmin.id}).`);
    }

    // ── 6. Seed teams ────────────────────────────────────────────────────
    console.log('Seeding teams...');

    const existingTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.company_id, companyId));

    let supportTeamId: string;
    let salesTeamId: string;

    if (existingTeams.length > 0) {
      supportTeamId = existingTeams[0].id;
      salesTeamId = existingTeams[1]?.id ?? existingTeams[0].id;
      console.log(`  Teams already exist (${existingTeams.length} entries). Skipping.`);
    } else {
      const [supportTeam] = await db
        .insert(teams)
        .values({ company_id: companyId, name: 'Support', description: 'Customer support team' })
        .returning();
      const [salesTeam] = await db
        .insert(teams)
        .values({ company_id: companyId, name: 'Sales', description: 'Sales and lead qualification' })
        .returning();
      supportTeamId = supportTeam.id;
      salesTeamId = salesTeam.id;
      console.log('  Created 2 teams (Support, Sales).');
    }

    // ── 7. Seed sample operators ─────────────────────────────────────────
    console.log('Seeding sample operators...');

    const existingOperators = await db
      .select()
      .from(operators)
      .where(eq(operators.company_id, companyId));

    if (existingOperators.length > 0) {
      console.log(`  Operators already exist (${existingOperators.length} entries). Skipping.`);
    } else {
      const operatorPassword = await bcrypt.hash('Operator123!', BCRYPT_ROUNDS);

      const sampleOperators = [
        { name: 'Alice Martinez', email: 'alice@chatbox.local', role: 'admin', status: 'online' },
        { name: 'Bob Wilson', email: 'bob@chatbox.local', role: 'manager', status: 'online' },
        { name: 'Carol Thompson', email: 'carol@chatbox.local', role: 'agent', status: 'away' },
        { name: 'David Lee', email: 'david@chatbox.local', role: 'agent', status: 'offline' },
        { name: 'Eva Nguyen', email: 'eva@chatbox.local', role: 'agent', status: 'online' },
      ];

      const insertedOperators = await db
        .insert(operators)
        .values(
          sampleOperators.map((op) => ({
            company_id: companyId,
            email: op.email,
            name: op.name,
            password_hash: operatorPassword,
            role: op.role,
            status: op.status,
            timezone: 'Europe/Bucharest',
            language: 'en',
            active: true,
          })),
        )
        .returning();

      // Assign teams
      const teamAssignments = [
        { operator_id: insertedOperators[0].id, team_id: supportTeamId },
        { operator_id: insertedOperators[0].id, team_id: salesTeamId },
        { operator_id: insertedOperators[1].id, team_id: supportTeamId },
        { operator_id: insertedOperators[2].id, team_id: supportTeamId },
        { operator_id: insertedOperators[3].id, team_id: salesTeamId },
        { operator_id: insertedOperators[4].id, team_id: supportTeamId },
      ];

      await db.insert(operatorTeams).values(teamAssignments);
      console.log(`  Created ${insertedOperators.length} operators with team assignments.`);
    }

    // ── 8. Check existing demo data ─────────────────────────────────────
    // The DB already has conversations, messages, and leads from prior seeding.
    // This section only runs on a fresh database.
    console.log('Checking demo conversations & leads...');

    const existingConvs = await pool.query(
      'SELECT COUNT(*)::int AS cnt FROM conversations WHERE company_id = $1',
      [companyId],
    );

    if (existingConvs.rows[0].cnt > 0) {
      console.log(`  ${existingConvs.rows[0].cnt} conversations already exist. Skipping demo data.`);
    } else {
      console.log('  No conversations found — seeding demo data...');

      // Fetch operator names for assignment
      const opRows = (await pool.query(
        'SELECT id, name FROM operators WHERE company_id = $1 AND active = true ORDER BY name',
        [companyId],
      )).rows;

      // Actual DB schema: conversations has customer_name, customer_email, assigned_agent (text),
      // resolved_by ('ai'|'agent'), first_response_at, status ('open'|'resolved'|'escalated')
      // Messages: sender_type ('customer'|'agent'|'ai'), sender_name, body

      const convTemplates = [
        { status: 'resolved', resolvedBy: 'ai', channel: 'web_chat', subject: 'How to reset password?', customer: 'John Doe', email: 'john@ex.com', agent: null, daysAgo: 0.5 },
        { status: 'resolved', resolvedBy: 'ai', channel: 'web_chat', subject: 'Pricing question', customer: 'Sarah Connor', email: 'sarah@ex.com', agent: null, daysAgo: 1 },
        { status: 'open', resolvedBy: null, channel: 'web_chat', subject: 'Feature request: dark mode', customer: 'Mike Chen', email: 'mike@ex.com', agent: null, daysAgo: 0.1 },
        { status: 'escalated', resolvedBy: null, channel: 'web_chat', subject: 'Billing issue', customer: 'Emma Wilson', email: 'emma@ex.com', agent: opRows[0]?.name ?? null, daysAgo: 2 },
        { status: 'open', resolvedBy: null, channel: 'web_chat', subject: 'Setup help', customer: 'Carlos Ruiz', email: 'carlos@ex.com', agent: null, daysAgo: 0.2 },
        { status: 'resolved', resolvedBy: 'ai', channel: 'web_chat', subject: 'Integrations help', customer: 'Aisha Patel', email: 'aisha@ex.com', agent: null, daysAgo: 3 },
        { status: 'resolved', resolvedBy: 'agent', channel: 'web_chat', subject: 'Service down', customer: 'Tom Bradley', email: 'tom@ex.com', agent: opRows[1]?.name ?? null, daysAgo: 4 },
        { status: 'resolved', resolvedBy: 'ai', channel: 'web_chat', subject: 'Export data', customer: 'Lisa Zhang', email: 'lisa@ex.com', agent: null, daysAgo: 6 },
        { status: 'open', resolvedBy: null, channel: 'web_chat', subject: 'Cannot upload files', customer: 'Raj Sharma', email: 'raj@ex.com', agent: null, daysAgo: 0.4 },
        { status: 'resolved', resolvedBy: 'ai', channel: 'web_chat', subject: 'Language support', customer: 'Nina Kowalski', email: 'nina@ex.com', agent: null, daysAgo: 7 },
        { status: 'escalated', resolvedBy: null, channel: 'web_chat', subject: 'Account deletion', customer: 'James Park', email: 'james@ex.com', agent: opRows[2]?.name ?? null, daysAgo: 0.05 },
        { status: 'resolved', resolvedBy: 'agent', channel: 'web_chat', subject: 'Payment failed', customer: 'Maria Garcia', email: 'maria@ex.com', agent: opRows[0]?.name ?? null, daysAgo: 5 },
        { status: 'resolved', resolvedBy: 'ai', channel: 'web_chat', subject: 'SSO setup', customer: 'John Doe', email: 'john@ex.com', agent: null, daysAgo: 12 },
        { status: 'resolved', resolvedBy: 'ai', channel: 'web_chat', subject: 'GDPR question', customer: 'Sarah Connor', email: 'sarah@ex.com', agent: null, daysAgo: 16 },
        { status: 'open', resolvedBy: null, channel: 'web_chat', subject: 'Slack integration', customer: 'Mike Chen', email: 'mike@ex.com', agent: null, daysAgo: 0.15 },
      ];

      const convIds: string[] = [];
      for (const t of convTemplates) {
        const createdAt = new Date(Date.now() - t.daysAgo * 86400000);
        const firstResponse = new Date(createdAt.getTime() + (30 + Math.random() * 180) * 1000);
        const resolvedAt = t.status === 'resolved'
          ? new Date(createdAt.getTime() + (t.daysAgo < 1 ? 600000 : 3600000))
          : null;

        const { rows } = await pool.query(
          `INSERT INTO conversations (
            company_id, customer_name, customer_email, channel, subject,
            status, assigned_agent, resolved_by, first_response_at, resolved_at,
            created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING id`,
          [
            companyId, t.customer, t.email, t.channel, t.subject,
            t.status, t.agent, t.resolvedBy, firstResponse, resolvedAt,
            createdAt,
          ],
        );
        convIds.push(rows[0].id);
      }
      console.log(`  Created ${convIds.length} conversations.`);

      // Insert messages (actual schema: sender_type, sender_name, body)
      let msgCount = 0;
      const custMsgs = ['Hi, I need help.', 'Can you assist me?', 'Thanks for the help!', 'I have a question.'];
      const aiMsgs = ['Hello! Let me help you with that.', 'Here are the steps...', 'I found the answer in our knowledge base.'];
      const agentMsgs = ['I\'m taking over. Let me check.', 'I\'ve reviewed your issue.', 'Let me process that.'];

      for (let ci = 0; ci < convIds.length; ci++) {
        const t = convTemplates[ci];
        const baseTime = new Date(Date.now() - t.daysAgo * 86400000);
        const numMsgs = 2 + Math.floor(Math.random() * 4);

        for (let mi = 0; mi < numMsgs; mi++) {
          const msgTime = new Date(baseTime.getTime() + mi * (30000 + Math.random() * 120000));
          const isCustomer = mi % 2 === 0;

          if (isCustomer) {
            await pool.query(
              'INSERT INTO messages (conversation_id, sender_type, sender_name, body, created_at) VALUES ($1,$2,$3,$4,$5)',
              [convIds[ci], 'customer', t.customer, custMsgs[mi % custMsgs.length], msgTime],
            );
          } else {
            const isAi = !t.agent;
            await pool.query(
              'INSERT INTO messages (conversation_id, sender_type, sender_name, body, created_at) VALUES ($1,$2,$3,$4,$5)',
              [convIds[ci], isAi ? 'ai' : 'agent', isAi ? 'AI Assistant' : t.agent, isAi ? aiMsgs[mi % aiMsgs.length] : agentMsgs[mi % agentMsgs.length], msgTime],
            );
          }
          msgCount++;
        }
      }
      console.log(`  Created ${msgCount} messages.`);

      // Seed leads (only if none exist)
      const existingLeads = await pool.query(
        'SELECT COUNT(*)::int AS cnt FROM leads WHERE company_id = $1', [companyId],
      );
      if (existingLeads.rows[0].cnt === 0) {
        const leadData = [
          { name: 'John Doe', email: 'john@ex.com', status: 'qualified', rating: 'hot', intent: 'Purchase Intent', score: 85 },
          { name: 'Sarah Connor', email: 'sarah@ex.com', status: 'contacted', rating: 'warm', intent: 'Demo Request', score: 70 },
          { name: 'Mike Chen', email: 'mike@ex.com', status: 'new', rating: 'cold', intent: 'Technical Inquiry', score: 30 },
          { name: 'Emma Wilson', email: 'emma@ex.com', status: 'converted', rating: 'hot', intent: 'Purchase Intent', score: 95 },
          { name: 'Carlos Ruiz', email: 'carlos@ex.com', status: 'contacted', rating: 'warm', intent: 'Demo Request', score: 60 },
        ];
        for (let i = 0; i < leadData.length; i++) {
          const l = leadData[i];
          await pool.query(
            `INSERT INTO leads (
              company_id, display_id, name, email, source, status, rating,
              conversation_id, first_message, message_count, intent, score,
              ai_summary, created_at, updated_at
            ) VALUES ($1,$2,$3,$4,'chat_widget',$5,$6,$7,'Initial inquiry',$8,$9,$10,$11, NOW() - ($12 || ' days')::interval, NOW())`,
            [
              companyId, `LD-${String(i + 1).padStart(4, '0')}`, l.name, l.email,
              l.status, l.rating, convIds[i] ?? null, Math.floor(Math.random() * 8) + 1,
              l.intent, l.score, `${l.intent} from ${l.name}`, String(Math.floor(Math.random() * 25)),
            ],
          );
        }
        console.log(`  Created ${leadData.length} leads.`);
      } else {
        console.log(`  ${existingLeads.rows[0].cnt} leads already exist. Skipping.`);
      }
    }

    // ── Done ──────────────────────────────────────────────────────────────
    console.log('\nSeed completed successfully!');
    console.log('Summary:');
    console.log(`  Company:  ${DEMO_COMPANY_NAME} (${DEMO_COMPANY_SLUG})`);
    console.log(`  Admin:    ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`  Schedule: Mon-Fri 09:00-18:00, Sat-Sun closed`);
    console.log(`  Channel:  web_chat (enabled)`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('Database connection closed.');
  }
}

seed();
