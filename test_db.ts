
import { prisma } from './src/lib/prisma';
async function test() {
  try {
    const count = await prisma.submission.count({ where: { status: 'approved' } });
    console.log('Connected! Found approved submissions:', count);
  } catch (e) {
    console.error('Connection failed:', e instanceof Error ? e.message : String(e));
  }
}
test();

