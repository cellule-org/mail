import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { ImapFlow, MailboxObject } from 'imapflow';
import { simpleParser } from 'mailparser';
import { WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
} as SMTPTransport.Options);

const client = new ImapFlow({
    host: process.env.IMAP_HOST as any,
    port: process.env.IMAP_PORT ? parseInt(process.env.IMAP_PORT) : 993,
    secure: process.env.IMAP_SECURE as any,
    auth: {
        user: process.env.IMAP_USER as any,
        pass: process.env.IMAP_PASS,
    },
    logger: false
});

export const handleReceiveEmail = async () => {
    await client.connect();
    for (let folder of await client.list()) {
        let lock;
        try {
            lock = await client.getMailboxLock(folder.path);
        } catch (err) {
            continue;
        }
        try {
            for await (let message of client.fetch('1:*', { source: true, envelope: true })) {
                let mail = await prisma.mail.findUnique({
                    where: {
                        id: message.uid.toString()
                    }
                });

                if (mail) {
                    continue;
                }
                console.log('New mail:', message.uid.toString());

                if (message.source) {
                    let body = await simpleParser(message.source);

                    let to = body.to;

                    let toAddresses: string[] = [];
                    if (to) {
                        if (Array.isArray(to)) {
                            toAddresses = to.map(address => address.value[0].address).filter((address): address is string => address !== undefined);
                        } else {
                            if (to.value[0].address) {
                                toAddresses.push(to.value[0].address);
                            }
                        }
                    }

                    await prisma.mail.create({
                        data: {
                            id: message.uid.toString(),
                            from: body.from?.value[0].address || "unknown",
                            to: toAddresses,
                            subject: body.subject || "No subject",
                            text: body.text || "No text",
                            html: body.html || "No html",
                            date: body.date,
                            Mailbox: {
                                connectOrCreate: {
                                    where: {
                                        id: folder.path
                                    },
                                    create: {
                                        id: folder.path,
                                        name: folder.path
                                    }
                                }
                            },
                            Thread: {
                                connectOrCreate: {
                                    where: {
                                        id: body.messageId
                                    },
                                    create: {
                                        id: message.threadId || message.uid.toString(),
                                    }
                                }
                            }
                        }
                    });
                }
            }
        } finally {
            lock.release();
        }
    }
    client.on('exists', async (mailbox: MailboxObject) => {
        console.log('New mail in mailbox:', mailbox.path);
        let lock = await client.getMailboxLock(mailbox.path);
        try {
            for await (let message of client.fetch('1:*', { envelope: true })) {
                console.log(message);
            }
        } finally {
            lock.release();
        }
    });
}


export const handleSendEmail = async (ws: WebSocket, data: any) => {
    const { to, subject, text, cc, bcc, ical, attachments } = data;
    let formattedAttachments;
    if (attachments) {
        console.log('Attachments:', attachments);
        formattedAttachments = attachments.map((attachment: any) => ({
            filename: attachment.title,
            content: Buffer.from(new Uint8Array(attachment.data.data))
        }));
    }

    transporter.sendMail({
        from: process.env.SMTP_USER,
        to,
        subject,
        text,
        cc: cc ? cc : undefined,
        bcc: bcc ? bcc : undefined,
        attachments: formattedAttachments ? formattedAttachments : undefined,
        icalEvent: ical ? {
            method: ical.method,
            filename: ical.filename,
            content: ical.content,
        } : undefined,
    }, (err, info) => {
        if (err) {
            ws.send(JSON.stringify({
                type: 'message',
                data: {
                    type: 'error',
                    title: 'Error sending email',
                    text: err.message,
                },
            }));
        } else {
            ws.send(JSON.stringify({
                type: 'message',
                data: {
                    type: 'success',
                    title: 'Email sent',
                    text: `Email successfully sent to ${to}`,
                },
            }));
        }
    });
};
