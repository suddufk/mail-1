import Dexie, { type Table } from 'dexie';

export type DraftRow = {
  draftId?: number;
  createTime: number;
  sendEmail?: string;
  receiveEmail: string[];
  subject: string;
  content: string;
  text?: string;
  attachments?: any[];
  sendType?: string;
  emailId?: number;
  name?: string;
  accountId?: number;
};

class MailDb extends Dexie {
  draft!: Table<DraftRow, number>;
  att!: Table<any, number>;

  constructor(name: string) {
    super(name || 'cloud-mail');
    this.version(1).stores({
      draft: '++draftId,createTime',
      att: 'draftId',
    });
  }
}

let db: MailDb | null = null;

export function getDb(userEmail?: string) {
  const name = userEmail || 'cloud-mail';
  if (!db || db.name !== name) db = new MailDb(name);
  return db;
}
