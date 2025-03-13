declare namespace NodeJS {
    interface ProcessEnv {
        SMTP_HOST: string;
        SMTP_PORT: string;  // Assurez-vous que les variables sont de type string car process.env retourne toujours des strings
        SMTP_SECURE: boolean;
        SMTP_USER: string;
        SMTP_PASS: string;
        IMAP_HOST: string;
        IMAP_PORT: string;
        IMAP_SECURE: boolean;
        IMAP_USER: string;
        IMAP_PASS: string;

        INBOX: string;
        SENT: string;
        DRAFTS: string;
        TRASH: string;
        SPAM: string;
    }
}
