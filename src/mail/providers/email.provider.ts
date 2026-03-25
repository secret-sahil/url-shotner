export interface EmailProvider {
  send(options: {
    to: string;
    subject: string;
    react: React.ReactNode;
  }): Promise<void>;
}
