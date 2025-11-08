export interface BlogPostContent {
  title: string;
  content: string;
  fallback?: boolean;
}

export interface MessageForSummary {
  text: string | null;
  senderName: string | null;
  sentAt: Date;
}
