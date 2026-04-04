import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/login';

  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to /login so the client-side Auth component can detect the
  // session on mount and perform the Flow Attachment logic if needed,
  // before jumping to the Focus Console or Dashboard.
  return NextResponse.redirect(new URL(next, request.url));
}
