export interface SyncResult {
  messagesAdded: number;
  errors: string[];
  lastSyncTime: Date;
}

export interface MessageThread {
  chatId: string;
  messageIds: number[];
  startTime: Date;
  endTime: Date;
  messageCount: number;
  participants: string[];
}
