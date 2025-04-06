import { ComponentProps } from "react"
import { Email } from "./email-list"
import { useTranslation } from "react-i18next"
import { format, formatDistanceToNow, Locale } from 'date-fns'
import { Button } from "./button"
import { Reply, Forward, X, Trash, MailOpen, MailCheck } from "lucide-react"
import sanitizeHtml from "sanitize-html";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

export interface EmailViewerProps {
    email: Email | null
    locale: Locale
    onReply?: (email: Email) => void
    onForward?: (email: Email) => void
    onClose?: () => void
    onDelete?: (email: Email) => void
    onMarkUnread?: (email: Email) => void
    onMarkRead?: (email: Email) => void
}

export default function EmailViewer({
    email,
    locale,
    onReply,
    onForward,
    onClose,
    onDelete,
    onMarkUnread,
    onMarkRead,
    ...props
}: EmailViewerProps & ComponentProps<"section">) {
    const { t } = useTranslation();


    const getRelativeTime = (date: Date) => {
        return formatDistanceToNow(date, { addSuffix: true, locale });
    };

    if (!email) {
        return;
    }
    const cleanHtml = sanitizeHtml(email.text, {
        allowedTags: [
            ...sanitizeHtml.defaults.allowedTags.filter(tag => tag !== "script"),
            'img', 'a', 'p', 'b', 'i', 'strong', 'em', 'br', 'div', 'span'
        ],
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            'a': ['href', 'target', 'rel'],
            'img': ['src', 'alt'],
        },
        transformTags: {
            'a': (_tagName, attribs) => {
                return {
                    tagName: 'a',
                    attribs: {
                        ...attribs,
                        target: '_blank',
                        rel: 'noopener noreferrer'
                    }
                };
            }
        }
    });

    const formattedTime = email.date ? format(new Date(email.date), 'dd/MM/yyyy HH:mm', { locale }) : '';
    const relativeTime = email.date ? getRelativeTime(new Date(email.date)) : '';

    return (
        <section className="space-y-4 min-h-full flex flex-col gap-4 pt-4" {...props}>
            <div className="flex justify-between items-center w-full px-4">
                <div className="flex gap-2">
                    {onDelete && email && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => onDelete(email)}
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1"
                                >
                                    <Trash size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('delete')}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                    {onMarkUnread && email && email.flags.includes('\\Seen') && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => onMarkUnread(email)}
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1"
                                >
                                    <MailCheck size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('mark_as_unread')}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                    {onMarkRead && email && !email.flags.includes('\\Seen') && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => onMarkRead(email)}
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1"
                                >
                                    <MailOpen size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{t('mark_as_read')}</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={onClose}
                        >
                            <X size={16} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t('close')}</p>
                    </TooltipContent>
                </Tooltip>
            </div>

            <div className="space-y-2 border-b px-4 pb-4">
                <div className="flex justify-between">
                    <h2 className="text-xl font-bold">{email.subject}</h2>
                    <div className="text-sm text-muted-foreground">
                        {formattedTime}
                        {relativeTime && <div>({relativeTime})</div>}
                    </div>
                </div>
                <div>
                    <p><span className="font-semibold">{t('from')}:</span> {email.from}</p>
                    <p><span className="font-semibold">{t('to')}:</span> {email.to}</p>
                </div>
            </div>

            <div className="px-4">
                <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
            </div>

            <div className="flex gap-2 px-4">
                <Button
                    onClick={() => onReply && email && onReply(email)}
                    variant="outline"
                    className="flex items-center gap-1"
                >
                    <Reply size={16} />
                    {t('reply')}
                </Button>
                <Button
                    onClick={() => onForward && email && onForward(email)}
                    variant="outline"
                    className="flex items-center gap-1"
                >
                    <Forward size={16} />
                    {t('forward')}
                </Button>
            </div>
        </section >
    )
}
