type SmtpConfig = {
    host: string
    port: number
    username: string
    password: string
    secure: boolean
}

type ImapConfig = {
    host: string
    port: number
    username: string
    password: string
    secure: boolean
}

type MailboxesConfig = {
    inbox: string
    sent: string
    drafts: string
    trash: string
    spam: string
}

export async function saveSmtpConfig(data: SmtpConfig) {
    try {
        const response = await fetch('/api/settings/smtp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to save SMTP configuration');
        }

        return await response.json();
    } catch (error) {
        console.error('Error saving SMTP config:', error);
        throw error;
    }
}

export async function saveImapConfig(data: ImapConfig) {
    try {
        const response = await fetch('/api/settings/imap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to save IMAP configuration');
        }

        return await response.json();
    } catch (error) {
        console.error('Error saving IMAP config:', error);
        throw error;
    }
}


export async function saveMailboxesConfig(data: MailboxesConfig) {
    try {
        const response = await fetch('/api/settings/mailboxes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to save mailboxes configuration');
        }

        return await response.json();
    } catch (error) {
        console.error('Error saving mailboxes config:', error);
        throw error;
    }
}