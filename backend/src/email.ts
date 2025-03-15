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

const stringToId = (str: string) => {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
};

const handleMailbox = async (path: string) => {
    let lock;
    try {
        lock = await client.getMailboxLock(path);
    } catch (err) {
        return;
    }
    try {
        for await (let message of client.fetch('1:*', { source: true, envelope: true, flags: true })) {
            let mail = await prisma.mail.findUnique({
                where: {
                    id: message.uid.toString()
                }
            });

            if (mail) {
                continue;
            }

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

                try {
                    await prisma.mail.create({
                        data: {
                            id: message.uid.toString(),
                            from: body.from?.value[0].address || "unknown",
                            flags: Array.from(message.flags || []),
                            cc: body.cc
                                ? Array.isArray(body.cc)
                                    ? body.cc.flatMap(address => address.value.map(email => email.address).filter((email): email is string => email !== undefined))
                                    : body.cc.value.map(email => email.address).filter((email): email is string => email !== undefined)
                                : [],
                            bcc: body.bcc
                                ? Array.isArray(body.bcc)
                                    ? body.bcc.flatMap(address => address.value.map(email => email.address).filter((email): email is string => email !== undefined))
                                    : body.bcc.value.map(email => email.address).filter((email): email is string => email !== undefined)
                                : [],
                            to: toAddresses,
                            subject: body.subject || "No subject",
                            text: body.html ? body.html : (body.textAsHtml ? body.textAsHtml : body.text || ""),
                            date: body.date,
                            Mailbox: {
                                connectOrCreate: {
                                    where: {
                                        id: stringToId(path)
                                    },
                                    create: {
                                        id: stringToId(path),
                                        name: path
                                    }
                                }
                            },
                            Thread: {
                                connectOrCreate: {
                                    where: {
                                        id: message.threadId || message.uid.toString()
                                    },
                                    create: {
                                        id: message.threadId || message.uid.toString(),
                                    }
                                }
                            }
                        }
                    });
                } catch (err) {
                    // Ignore duplicate errors
                }
            }
        }
    } finally {
        lock.release();
    }
}

export const handleReceiveEmail = async () => {
    //We have to make sure to handle the INBOX at the end (cause it could contain emails from other mailboxes)
    await client.connect();
    const mailboxes = await client.list();
    console.log('Mailboxes:', mailboxes.map(mailbox => mailbox.path));
    let supported_mailboxes = [process.env.SENT, process.env.DRAFTS, process.env.TRASH, process.env.SPAM]; // Only process these mailboxes

    for (let folder of await client.list()) {
        if (folder.path === 'INBOX' || folder.path === process.env.INBOX || !supported_mailboxes.includes(folder.path)) {
            continue;
        }
        console.log('Processing mailbox:', folder.path);
        await handleMailbox(folder.path);
    }
    if (process.env.INBOX) {
        console.log('Processing mailbox:', process.env.INBOX);
        await handleMailbox(process.env.INBOX);
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

export const addFlag = async (ws: WebSocket, data: { uid: string, flag: string }) => {
    const { uid, flag } = data;
    await client.messageFlagsAdd(uid, [flag]);
    let flags = await prisma.mail.findUnique({
        where: {
            id: uid
        }
    }).then(mail => mail?.flags);
    if (!flags) {
        flags = [];
    }
    flags.push(flag);
    await prisma.mail.update({
        where: {
            id: uid
        },
        data: {
            flags
        }
    });
}

export const removeFlag = async (ws: WebSocket, data: { uid: string, flag: string }) => {
    const { uid, flag } = data;
    await client.messageFlagsRemove(uid, [flag]);
    let flags = await prisma.mail.findUnique({
        where: {
            id: uid
        }
    }).then(mail => mail?.flags);
    if (!flags) {
        flags = [];
    }
    flags = flags.filter(f => f !== flag);
    await prisma.mail.update({
        where: {
            id: uid
        },
        data: {
            flags
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
        html: text,
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


export const handleReplyEmail = async (ws: WebSocket, data: any) => {
    const { to, subject, text, cc, bcc, attachments, inReplyTo } = data;
    let formattedAttachments;
    if (attachments && attachments.length > 0) {
        formattedAttachments = attachments.map((attachment: any) => ({
            filename: attachment.title,
            content: Buffer.from(new Uint8Array(attachment.data.data))
        }));
    }

    transporter.sendMail({
        from: process.env.SMTP_USER,
        inReplyTo,
        references: inReplyTo,
        to,
        replyTo: to,
        subject,
        html: text,
        cc: cc ? cc : undefined,
        bcc: bcc ? bcc : undefined,
        attachments: formattedAttachments ? formattedAttachments : undefined,
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
}