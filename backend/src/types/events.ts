export enum CoreEvents {
    USER_REGISTERED = 'core_user_registered',
    USER_DELETED = 'core_user_deleted',
    USER_LOGIN = 'core_user_login'
}

export enum EmailEvents {
    EMAIL_SENT = 'mail_send_email',
    EMAIL_RECEIVED = 'mail_receive_email'
}

export type SmtpConfig = {
    host: string
    port: number
    username: string
    password: string
    secure: boolean
}

export type ImapConfig = {
    host: string
    port: number
    username: string
    password: string
    secure: boolean
}

export type MailboxesConfig = {
    inbox: string
    sent: string
    drafts: string
    trash: string
    spam: string
}