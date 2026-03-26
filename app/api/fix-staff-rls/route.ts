import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const command = 'ALTER TABLE staff DISABLE ROW LEVEL SECURITY;'
  
  return NextResponse.json({
    status: 'RLS_BLOCKED',
    problem: 'Staff table has RLS enabled, blocking API access',
    solution: 'Run the SQL command below in Supabase SQL Editor',
    sql_command: command,
    steps: [
      '1. Open Supabase Dashboard: https://supabase.com/dashboard',
      '2. Select clinic-care project',
      '3. Go to SQL Editor',
      '4. Click "New Query"',
      '5. Paste: ' + command,
      '6. Click Run Button',
      '7. Refresh this browser page',
      '8. Staff will load automatically',
    ],
    html_instructions: `
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <h2 style="margin-top: 0;">🔧 RLS Fix Required</h2>
        <p>Copy this SQL command and run it in Supabase SQL Editor:</p>
        <code style="background: #fff; padding: 12px; border-radius: 4px; display: block; margin: 10px 0; font-family: monospace;">
          ${command}
        </code>
        <button onclick="navigator.clipboard.writeText('${command}'); alert('Copied!')" style="background: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
          📋 Copy Command
        </button>
      </div>
    `,
    direct_link: 'https://supabase.com/dashboard/project/[project-id]/sql/new',
  })
}
