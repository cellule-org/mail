"use client"

import { ComponentProps, useEffect, useRef, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { cn } from "@/lib/utils"

import { formatDistanceToNow } from "date-fns"
import { useSearchParams } from "react-router"
import { Input } from "./input"
import { Search } from "lucide-react"

export interface Email {
    id: string
    from: string
    to: string[]
    subject: string
    text: string
    html: string
    attachments?: {
        name: string
        size: number
        type: string
    }[]
    date: string
    read: boolean
    labels: string[]
    mailboxId: string
    threadId: string
}

interface EmailListProps {
    emails: Email[]
    onBottomReached: () => void
    onMailClick: (email: Email) => void
    loading?: boolean
}

export function EmailList({ emails, onBottomReached, onMailClick, loading = false, className, ...props }: EmailListProps & ComponentProps<"section">) {
    const [mails, setMails] = useState(emails);

    const bottomRef = useRef<HTMLDivElement>(null)

    const [mailboxes, setMailboxes] = useState(() => JSON.parse(sessionStorage.getItem('mailboxes') || '{}'));

    useEffect(() => {
        const handleStorageChange = () => {
            setMailboxes(JSON.parse(sessionStorage.getItem('mailboxes') || '{}'));
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);


    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loading) {
                    onBottomReached()
                }
            },
            { threshold: 0.5 },
        )

        if (bottomRef.current) {
            observer.observe(bottomRef.current)
        }

        return () => {
            if (bottomRef.current) {
                observer.unobserve(bottomRef.current)
            }
        }
    }, [onBottomReached, loading])

    const truncateText = (text: string, maxLength: number) => {
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
    }

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .toUpperCase()
            .substring(0, 2)
    }

    const filterEmails = (emails: Email[], mailbox: string | null, search: string | null) => {
        return emails.filter(email => {
            return mailbox ? email.mailboxId === mailbox : (mailboxes.TRASH ? email.mailboxId === mailboxes.TRASH : true);
        }).map(email => {
            let score = 0;

            if (search) {
                const searchLower = search.toLowerCase();
                if (email.from.toLowerCase().includes(searchLower)) score += 4;
                if (email.subject.toLowerCase().includes(searchLower)) score += 3;
                if (email.text.toLowerCase().includes(searchLower)) score += 2;
                if (email.html.toLowerCase().includes(searchLower)) score += 2;
            }

            return { ...email, score };
        }).filter(email => {
            if (!search) return true;
            return email.score > 0
        })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .sort((a, b) => {
                if (!search) return 0;
                return b.score - a.score;
            });
    }

    useEffect(() => {
        console.log('emails', emails);
        console.log('searchParams', searchParams);
        setMails(filterEmails(emails, searchParams.get('mailbox'), searchParams.get('search')));
    }, [emails, searchParams.get('mailbox'), searchParams.get('search')])

    return (
        <section key={`mailbox-${searchParams.get('mailbox')}`} className={cn("w-full space-y-2", className)} {...props}>
            <Input
                prefixIcon={<Search size={16} />}
                placeholder="Search emails..."
                value={searchParams.get('search') || ""}
                onChange={(e) => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('search', e.target.value);
                    setSearchParams(newParams);
                }}
            />
            {mails.map((email) => (
                <Card key={email.id} className="transition-all py-0 shadow-none" onClick={() => onMailClick(email)}>
                    <CardContent className="p-4">
                        <section className="flex items-start gap-4">
                            <Avatar className="h-10 w-10 mt-1">
                                <AvatarFallback>{getInitials(email.from)}</AvatarFallback>
                            </Avatar>

                            <section className="flex-1 space-y-1.5">
                                <section className="flex items-center justify-between">
                                    <section className="font-medium">{email.from}</section>
                                    <section className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(email.date, { addSuffix: true })}
                                    </section>
                                </section>

                                <section className="font-semibold">{email.subject}</section>

                                <section className="text-sm text-muted-foreground">{truncateText(email.text, 100)}</section>

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
            ))}

            {loading && <section className="py-4 text-center text-sm text-muted-foreground">Loading more emails...</section>}

            <section ref={bottomRef} className="h-4" />
        </section>
    )
}

