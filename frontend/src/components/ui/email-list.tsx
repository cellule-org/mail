import { ComponentProps, useEffect, useMemo, useRef, useState } from "react"
import { BarLoader } from "react-spinners"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { cn } from "@/lib/utils"

import { formatDistanceToNow, Locale } from "date-fns"
import { useSearchParams } from "react-router"
import { Input } from "./input"
import { Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "./context-menu"
import { useTheme } from "../theme-provider"

export interface Email {
    mailId: string
    from: string
    to: string[]
    subject: string
    text: string
    cc?: string[]
    bcc?: string[]
    attachments?: {
        name: string
        size: number
        type: string
    }[]
    date: string
    flags: string[]
    labels: string[]
    mailboxId: string
    threadId: string
}

interface EmailListProps {
    emails: Email[]
    locale: Locale
    onBottomReached: () => void
    onMailClick: (email: Email) => void
    onMarkAsRead: (email: Email) => void
    onMarkAsUnread: (email: Email) => void
    onArchive: (email: Email) => void
    onDelete: (email: Email) => void
    onReply: (email: Email) => void
    onReplyAll: (email: Email) => void
    onForward: (email: Email) => void
    onCopyEmailAddress: (email: Email) => void
    onBlock: (email: Email) => void
}

export function EmailList({
    emails,
    locale,
    onBottomReached,
    onMailClick,
    onMarkAsRead,
    onMarkAsUnread,
    onArchive,
    onDelete,
    onReply,
    onReplyAll,
    onForward,
    onCopyEmailAddress,
    onBlock,
    className,
    ...props
}: EmailListProps & ComponentProps<"section">) {
    const bottomRef = useRef<HTMLDivElement>(null)
    const [mailboxes, setMailboxes] = useState(() => JSON.parse(sessionStorage.getItem('mailboxes') || '{}'))
    const { t } = useTranslation()

    const { theme } = useTheme()

    useEffect(() => {
        const handleStorageChange = () => {
            setMailboxes(JSON.parse(sessionStorage.getItem('mailboxes') || '{}'))
        }
        window.addEventListener('storage', handleStorageChange)
        return () => {
            window.removeEventListener('storage', handleStorageChange)
        }
    }, [])

    const [searchParams, setSearchParams] = useSearchParams()

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onBottomReached()
                }
            },
            { threshold: 0.5 }
        )
        if (bottomRef.current) {
            observer.observe(bottomRef.current)
        }
        return () => {
            if (bottomRef.current) {
                observer.unobserve(bottomRef.current)
            }
        }
    }, [onBottomReached])

    const cleanUpHTML = (html: string): string => {
        let content = new DOMParser()
            .parseFromString(
                html.replace(/<head(?:[\s\S]*?)<\/head>/gi, "").replace(/<style(?:[\s\S]*?)<\/style>/gi, ""),
                "text/html"
            ).body.textContent || ""
        content = content.replace(/&zwnj;/g, " ").replace(/&nbsp;/g, " ")
        content = content.trim()
        content = content.replace(/\s\s+/g, " ")
        content = content.replace(/\n/g, " ")
        return content
    }

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .substring(0, 2)
    }

    const filteredEmails = useMemo(() => {
        return emails
            .filter(email => {
                return searchParams.get('mailbox')
                    ? email.mailboxId === searchParams.get('mailbox')
                    : (mailboxes.TRASH ? email.mailboxId === mailboxes.TRASH : true)
            })
            .map(email => {
                let score = 0
                if (searchParams.get('search')) {
                    const searchLower = searchParams.get('search')!.toLowerCase()
                    if (email.from.toLowerCase().includes(searchLower)) score += 4
                    if (email.subject.toLowerCase().includes(searchLower)) score += 3
                    if (email.text.toLowerCase().includes(searchLower)) score += 2
                }
                return { ...email, score }
            })
            .filter(email => {
                if (!searchParams.get('search')) return true
                return email.score > 0
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .sort((a, b) => {
                if (!searchParams.get('search')) return 0
                return b.score - a.score
            })
    }, [emails, searchParams, mailboxes])

    return (
        <section key={`mailbox-${searchParams.get('mailbox')}`} className={cn("w-full flex flex-col gap-2", className)} {...props}>
            <Input
                prefixIcon={<Search size={16} />}
                placeholder={t("search")}
                value={searchParams.get('search') || ""}
                onChange={(e) => {
                    const newParams = new URLSearchParams(searchParams)
                    newParams.set('search', e.target.value)
                    setSearchParams(newParams)
                }}
            />
            {filteredEmails.length > 0 ? (
                filteredEmails.map((email) => (
                    <ContextMenu key={email.mailId}>
                        <ContextMenuTrigger>
                            <Card className="transition-all py-0 shadow-none cursor-pointer" onClick={() => onMailClick(email)}>
                                <CardContent className="p-4">
                                    <section className="flex items-start gap-4">
                                        <Avatar className="h-10 w-10 mt-1">
                                            <AvatarFallback>{getInitials(email.from)}</AvatarFallback>
                                        </Avatar>

                                        <section className="flex-1 space-y-1.5 w-1/2">
                                            <section className="flex items-center justify-between">
                                                <section className="font-medium">{email.from}</section>
                                                <section className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(email.date, { addSuffix: true, locale })}
                                                </section>
                                            </section>

                                            <section className={cn("overflow-hidden text-ellipsis whitespace-nowrap", !email.flags.includes("\\Seen") ? "font-semibold" : "font-normal")}>
                                                {email.subject}
                                            </section>

                                            <section className="text-sm text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                                                {cleanUpHTML(email.text)}
                                            </section>

                                            <section className="flex items-center gap-2 pt-1">
                                                {email.attachments && email.attachments.length > 0 && (
                                                    <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                                        {email.attachments.length} attachment{email.attachments.length > 1 ? "s" : ""}
                                                    </Badge>
                                                )}
                                            </section>
                                        </section>
                                    </section>
                                </CardContent>
                            </Card>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuGroup>
                                <ContextMenuItem onClick={() => onMarkAsRead(email)}>{t("mark_as_read")}</ContextMenuItem>
                                <ContextMenuItem onClick={() => onMarkAsUnread(email)}>{t("mark_as_unread")}</ContextMenuItem>
                            </ContextMenuGroup>
                            <ContextMenuSeparator />
                            <ContextMenuGroup>
                                <ContextMenuItem onClick={() => onArchive(email)}>{t("archive")}</ContextMenuItem>
                                <ContextMenuItem onClick={() => onDelete(email)}>{t("delete")}</ContextMenuItem>
                            </ContextMenuGroup>
                            <ContextMenuSeparator />
                            <ContextMenuGroup>
                                <ContextMenuItem onClick={() => onReply(email)}>{t("reply")}</ContextMenuItem>
                                <ContextMenuItem onClick={() => onReplyAll(email)}>{t("reply_all")}</ContextMenuItem>
                                <ContextMenuItem onClick={() => onForward(email)}>{t("forward")}</ContextMenuItem>
                            </ContextMenuGroup>
                            <ContextMenuSeparator />
                            <ContextMenuGroup>
                                <ContextMenuItem onClick={() => onCopyEmailAddress(email)}>{t("copy_email")}</ContextMenuItem>
                                <ContextMenuItem onClick={() => onBlock(email)}>{t("block")}</ContextMenuItem>
                            </ContextMenuGroup>
                        </ContextMenuContent>
                    </ContextMenu>
                ))
            ) : (
                <section className="py-8 flex justify-center items-center flex-col gap-4">
                    <span className="text-sm text-muted-foreground">{t("loading")}</span>
                    <BarLoader color={theme === "light" ? "black" : "white"} width={150} />
                </section>
            )}
            <section ref={bottomRef} className="h-4" />
        </section>
    )
}
