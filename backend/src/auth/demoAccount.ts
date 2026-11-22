// The pre-created HR account, seeded into the database by `npm run seed` so there
// is always a working login. Override with env vars; the defaults keep a fresh
// clone usable out of the box. (This is a demo credential, not a real secret.)
export const DEMO_HR_ACCOUNT = {
  username: process.env.DEMO_HR_USERNAME ?? 'hr@salary.demo',
  password: process.env.DEMO_HR_PASSWORD ?? 'salary-demo-123',
};
