import { handleGenesis } from '../../../../lib/genesis/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ action: string }> };
async function handler(request: Request, context: Context) {
  return handleGenesis(request, (await context.params).action);
}
export { handler as GET, handler as POST };
