const fs = require('fs');
let code = fs.readFileSync('src/data/sqliteRepository.ts', 'utf8');

const authCheck = `
  private async assertAuthorization(tableName: string, action: string, userId?: string) {
    if (!userId || ['audit_log', 'sync_outbox', 'app_users', 'app_sessions', 'audit_auth'].includes(tableName)) return;
    const db = await this.database();
    const rows = await db.select<any[]>('SELECT role, status FROM app_users WHERE id = $1', [userId]);
    if (!rows || rows.length === 0) throw new Error('User not found or disabled.');
    const user = rows[0];
    if (user.status !== 'Active') throw new Error('User account is disabled.');
    
    // G2 matrix - basic mock check
    if (user.role === 'Viewer' && action !== 'Read') {
       throw new Error('Viewers cannot perform mutations.');
    }
  }
`;

if (!code.includes('assertAuthorization')) {
  code = code.replace("private async assertDelayEventScope", authCheck + "\n  private async assertDelayEventScope");
  fs.writeFileSync('src/data/sqliteRepository.ts', code);
}
