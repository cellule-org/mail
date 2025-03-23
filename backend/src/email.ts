import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { ImapFlow, MailboxObject } from 'imapflow';
import { simpleParser } from 'mailparser';
import { WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';
import { userConnections, websocketToUserId } from '.';

const prisma = new PrismaClient();

export const createTransporter = (smtpConfig: {
    id: string;
    username: string;
    host: string;
    port: number;
    password: string;
    secure: boolean;
}): nodemailer.Transporter => {
    return nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
            user: smtpConfig.username,
            pass: smtpConfig.password,
        },
    } as SMTPTransport.Options);
}

export const createImapFlow = (imapConfig: {
    id: string;
    username: string;
    host: string;
    port: number;
    password: string;
    secure: boolean;
}): ImapFlow => {
    return new ImapFlow({
        host: imapConfig.host,
        port: imapConfig.port,
        secure: imapConfig.secure,
        auth: {
            user: imapConfig.username,
            pass: imapConfig.password,
        },
        logger: false
    });
}

const stringToId = (str: string) => {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
};

const userIdToTransporter = async (user_id: string) => {
    return userConnections.get(user_id)?.transporter;
}

const userIdToImapFlow = async (user_id: string) => {
    return userConnections.get(user_id)?.imap_flow;
}

const handleMail = async (user_id: string, message: any, path: string) => {
    let mail = await prisma.mail.findUnique({
        where: {
            id: {
                mailId: message.uid.toString(),
                userId: user_id
            }
        }
    });

    if (mail) {
        return;
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
                    mailId: message.uid.toString(),
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
                    },
                    User: {
                        connect: {
                            id: user_id
                        }
                    },
                }
            });
        } catch (err) {
            // Ignore duplicate errors
        }
    }
}

const handleMailbox = async (user_id: string, path: string) => {
    let client = await userIdToImapFlow(user_id);
    if (!client) {
        return;
    }
    let lock;
    try {
        lock = await client.getMailboxLock(path);
    } catch (err) {
        return;
    }
    try {
        for await (let message of client.fetch('1:*', { source: true, envelope: true, flags: true })) {
            await handleMail(user_id, message, path);
        }
    } finally {
        lock.release();
    }
}

export const handleReceiveEmail = async (user_id: string) => {
    let client = await userIdToImapFlow(user_id);
    if (!client) {
        return;
    }
    //We have to make sure to handle the INBOX at the end (cause it could contain emails from other mailboxes)
    let user = await prisma.user.findUnique({
        where: {
            id: user_id
        },
        include: {
            mailboxes: true
        }
    });
    if (!user || !user.mailboxes) {
        return;
    }
    await client.connect();
    const mailboxes = await client.list();
    console.log('Mailboxes:', mailboxes.map(mailbox => mailbox.path));
    let supported_mailboxes = [user.mailboxes.sent, user.mailboxes.drafts, user.mailboxes.trash, user.mailboxes.spam]; // Only process these mailboxes

    for (let folder of await client.list()) {
        if (folder.path === 'INBOX' || folder.path === user.mailboxes.inbox || !supported_mailboxes.includes(folder.path)) {
            continue;
        }
        console.log('Processing mailbox:', folder.path);
        await handleMailbox(user_id, folder.path);
    }
    if (user.mailboxes.inbox) {
        console.log('Processing mailbox:', user.mailboxes.inbox);
        await handleMailbox(user_id, user.mailboxes.inbox);
    }
    client.on('exists', async (mailbox: MailboxObject) => {
        console.log('New mail in mailbox:', mailbox.path);
        let lock = await client.getMailboxLock(mailbox.path);
        try {
            for await (let message of client.fetch('1:*', { source: true, envelope: true, flags: true })) {
                await handleMail(user_id, message, mailbox.path);
            }
        } finally {
            lock.release();
        }
    });
}

export const addFlag = async (ws: WebSocket, data: { uid: string, user_id: string, flag: string }) => {
    let client = await userIdToImapFlow(data.user_id);
    if (!client) {
        return;
    }
    const { uid, flag } = data;
    await client.messageFlagsAdd(uid, [flag]);
    let flags = await prisma.mail.findUnique({
        where: {
            id: {
                mailId: uid,
                userId: data.user_id
            }
        }
    }).then(mail => mail?.flags);
    if (!flags) {
        flags = [];
    }
    flags.push(flag);
    await prisma.mail.update({
        where: {
            id: {
                mailId: uid,
                userId: data.user_id
            }
        },
        data: {
            flags
        }
    });
}

export const removeFlag = async (ws: WebSocket, data: { uid: string, user_id: string, flag: string }) => {
    let client = await userIdToImapFlow(data.user_id);
    if (!client) {
        return;
    }
    const { uid, flag } = data;
    await client.messageFlagsRemove(uid, [flag]);
    let flags = await prisma.mail.findUnique({
        where: {
            id: {
                mailId: uid,
                userId: data.user_id
            }
        }
    }).then(mail => mail?.flags);
    if (!flags) {
        flags = [];
    }
    flags = flags.filter(f => f !== flag);
    await prisma.mail.update({
        where: {
            id: {
                mailId: uid,
                userId: data.user_id
            }
        },
        data: {
            flags
        }
    });
}

export const handleSendEmail = async (ws: WebSocket, data: any, isResponse: boolean) => {
    let user_id = data.userId;
    if (!user_id) {
        return;
    }

    let transporter = await userIdToTransporter(user_id);
    if (!transporter) {
        ws.send(JSON.stringify({
            type: 'message',
            data: {
                type: 'error',
                title: 'Error sending email',
                message: 'No SMTP configuration found',
            },
        }));
        return;
    }

    let userData = await prisma.user.findUnique({ where: { id: user_id }, include: { imap: true, smtp: true } });
    if (!userData || !userData.smtp) {
        ws.send(JSON.stringify({
            type: 'message',
            data: {
                type: 'error',
                title: 'Error sending email',
                message: 'No SMTP configuration found',
            },
        }));
        return;
    }

    ws.send(JSON.stringify({
        type: 'message',
        data: {
            type: 'info',
            title: 'Sending email',
            message: 'Please wait while we send your email...',
        },
    }));

    const { to, subject, text, cc, bcc, attachments } = data;
    let formattedAttachments;
    if (attachments && attachments.length > 0) {
        formattedAttachments = attachments.map((attachment: any) => ({
            filename: attachment.title,
            content: Buffer.from(new Uint8Array(attachment.data.data))
        }));
    }

    // Prepare mail options based on if it's a reply or a new email
    let mailOptions: any = {};
    if (isResponse) {
        mailOptions = {
            from: userData.smtp.username,
            inReplyTo: data.inReplyTo,
            references: data.inReplyTo,
            to,
            replyTo: to,
            subject,
            html: text,
            cc: cc ? cc : undefined,
            bcc: bcc ? bcc : undefined,
            attachments: formattedAttachments ? formattedAttachments : undefined,
        };
    } else {
        mailOptions = {
            from: userData.smtp.username,
            to,
            subject,
            html: text,
            cc: cc ? cc : undefined,
            bcc: bcc ? bcc : undefined,
            attachments: formattedAttachments ? formattedAttachments : undefined,
        };
    }

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            ws.send(JSON.stringify({
                type: 'message',
                data: {
                    type: 'error',
                    title: 'Error sending email',
                    message: err.message,
                },
            }));
        } else {
            ws.send(JSON.stringify({
                type: 'message',
                data: {
                    type: 'success',
                    title: 'Email sent',
                    message: `Email successfully sent to ${to}`,
                },
            }));
        }
    });
};
