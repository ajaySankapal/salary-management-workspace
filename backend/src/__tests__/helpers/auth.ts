import request from 'supertest';
import type { Express } from 'express';
import type { Pool } from 'pg';
import { seedDemoUser } from '../../seed/seed';
import { DEMO_HR_ACCOUNT } from '../../auth/demoAccount';

// Seeds the demo HR user and returns a supertest agent that is already signed in,
// so API tests can reach the protected endpoints. The agent keeps the session
// cookie across requests.
export async function signedInAgent(app: Express, pool: Pool) {
  await seedDemoUser(pool);
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send(DEMO_HR_ACCOUNT);
  return agent;
}
