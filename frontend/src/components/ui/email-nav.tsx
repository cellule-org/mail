import { Link, useSearchParams } from "react-router";
import { ModeToggle } from "./mode-toogle";
import { cn } from "@/lib/utils";
import { Separator } from "./separator";
import { Button } from "./button";
import { File, Inbox, MailPlus, MailWarning, Send, Trash2 } from "lucide-react";
import { cloneElement, ReactElement } from "react";
import { useTranslation } from "react-i18next";

interface Tag {
    id: string;
    label: string;
}

export interface Mailboxes {
    INBOX: string;
    SENT: string;
    DRAFTS: string;
    TRASH: string;
    SPAM: string;
}

interface EmailNavProps {
    mailboxes: Mailboxes | null;
    tags: Tag[];
    onNewMessage: () => void;
}

const MailboxLink = ({ mailbox, icon, label }: { mailbox: string, icon: ReactElement, label: string }) => {
    const stringToId = (str: string) => {
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    const [searchParams, _setSearchParams] = useSearchParams();

    const isActive = searchParams.get('mailbox') === stringToId(mailbox);

    return (
        <li key={stringToId(mailbox)} className={cn("rounded-sm", { 'bg-neutral-200 dark:bg-neutral-800': isActive })}>
            <Link to={`/?mailbox=${stringToId(mailbox)}`} className="flex items-center gap-2 px-4 py-2">
                {cloneElement(icon as ReactElement<any>, { className: cn({ 'text-neutral-800 dark:text-neutral-200': isActive }) })}
                <span className={cn({ 'text-neutral-800 dark:text-neutral-200': isActive })}>{label}</span>
            </Link>
        </li>
    );
}

const EmailNav = ({ tags, mailboxes, onNewMessage, className, ...props }: EmailNavProps & React.ComponentProps<"nav">) => {
    const { t } = useTranslation();

    return (
        <nav className={cn("flex flex-col justify-between h-full bg-card shadow-lg", className)} {...props}>
            <section className="flex flex-col gap-4 h-full">
                <h1 className="font-bold text-xl">Mail</h1>
                <Button className="w-full min-w-fit" onClick={onNewMessage}>
                    <MailPlus size={24} />
                    {t('new_message')}
                </Button>

                {mailboxes && (
                    <section className="flex flex-col justify-start gap-4">
                        <h2 className="text-lg font-semibold">{t('categories')}</h2>
                        <ul className="flex flex-col gap-2">
                            {mailboxes.INBOX && (
                                <MailboxLink mailbox={mailboxes.INBOX} icon={<Inbox size={16} />} label={t('inbox')} />
                            )}
                            {mailboxes.DRAFTS && (
                                <MailboxLink mailbox={mailboxes.DRAFTS} icon={<File size={16} />} label={t('drafts')} />
                            )}
                            {mailboxes.SENT && (
                                <MailboxLink mailbox={mailboxes.SENT} icon={<Send size={16} />} label={t('sent')} />
                            )}
                            {mailboxes.SPAM && (
                                <MailboxLink mailbox={mailboxes.SPAM} icon={<MailWarning size={16} />} label={t('spam')} />
                            )}
                            {mailboxes.TRASH && (
                                <MailboxLink mailbox={mailboxes.TRASH} icon={<Trash2 size={16} />} label={t('trash')} />
                            )}
                        </ul>
                    </section>
                )}

                {tags.length > 0 && (
                    <>
                        <Separator />
                        <section className="flex flex-col justify-start gap-4">
                            <h2>Tags</h2>
                            <ul className="flex flex-col gap-2">
                                {tags.map((tag) => (
                                    <li key={tag.id}>
                                        <Link to={`/?tag=${tag.id}`}>{tag.label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </>
                )}
            </section>


            <section className="flex flex-col gap-4">
                <Button asChild variant={"outline"}><Link to="/settings">{t('settings')}</Link></Button>
                <ModeToggle />
            </section>
        </nav>
    );
}


export default EmailNav;