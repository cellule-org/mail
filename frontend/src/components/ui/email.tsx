"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useEffect, useState, useRef } from "react"
import { Buffer } from "buffer"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { useWebSocketContext } from "@/lib/websocket-context"
import { Email } from "./email-list"
import { MinimalTiptapEditor } from "../minimal-tiptap"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardFooter, CardHeader } from "./card"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const emailFormSchema = z.object({
    to: z.string().email({ message: "Please enter a valid email address" }),
    subject: z.string().min(1, { message: "Subject is required" }),
    text: z.string().min(1, { message: "Email body is required" }),
    cc: z.string().email({ message: "Please enter a valid email address" }).optional().or(z.literal("")),
    bcc: z.string().email({ message: "Please enter a valid email address" }).optional().or(z.literal("")),
    attachments: z.any().optional(),
})

type EmailFormValues = z.infer<typeof emailFormSchema>

export interface EmailReplyProps {
    email: Email | null
    onClose: () => void
}

export default function EmailForm({
    email,
    onClose,
    className,
    ...props
}: EmailReplyProps & React.ComponentProps<"div">) {
    const { sendMessage } = useWebSocketContext()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { t } = useTranslation();

    const [size, setSize] = useState({ width: window.innerWidth * 0.5, height: window.innerHeight * 0.8 });
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartPos = useRef({ x: 0, y: 0 });
    const startSize = useRef({ width: 0, height: 0 });

    const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailFormSchema),
        defaultValues: {
            to: email ? email.from : "",
            subject: email ? email.subject : "",
            text: "",
            cc: "",
            bcc: "",
            attachments: undefined,
        },
    })

    // Update form values when props change
    useEffect(() => {
        form.reset({
            to: email ? email.from : "",
            subject: email ? email.subject : "",
            text: "",
            cc: "",
            bcc: "",
            attachments: undefined,
        })
    }, [email, form])

    // Resize handlers
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartPos.current = { x: e.clientX, y: e.clientY };
        startSize.current = { width: size.width, height: size.height };
    };

    useEffect(() => {
        const handleResizeMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const dx = e.clientX - resizeStartPos.current.x;
            const dy = e.clientY - resizeStartPos.current.y;

            setSize({
                width: Math.min(Math.max(300, startSize.current.width - dx), window.innerWidth * 0.5),
                height: Math.min(Math.max(600, startSize.current.height - dy), window.innerHeight * 0.8),
            });
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleResizeMove);
            window.addEventListener('mouseup', handleResizeEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleResizeMove);
            window.removeEventListener('mouseup', handleResizeEnd);
        };
    }, [isResizing]);

    const onSubmit = async (data: EmailFormValues) => {
        setIsSubmitting(true)

        try {
            const files = data.attachments ? Array.from(data.attachments as FileList) : []
            const formattedAttachments = await Promise.all(
                files.map(async (attachment) => ({
                    title: attachment.name,
                    data: Buffer.from(await attachment.arrayBuffer()),
                })),
            )

            const emailData = {
                ...data,
                inReplyTo: email ? email.id : undefined,
                attachments: formattedAttachments,
            }

            sendMessage({
                type: email ? 'reply_email' : "send_email",
                data: emailData,
            })
        } catch (error) {
            console.error("Error sending email:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Card
            {...props}
            style={{
                width: size.width,
                height: size.height,
            }}
            className={cn("border rounded-lg shadow-md absolute overflow-hidden bottom-2 right-2 z-20", className)}
        >
            <CardHeader className="flex items-center justify-between">
                <div className="flex justify-between items-center w-full">
                    <h2 className="text-lg font-semibold">
                        {email ? t("reply") : t("new_message")}
                    </h2>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="overflow-auto !px-0">
                {/* Resize handles */}
                <div
                    className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize"
                    onMouseDown={(e) => handleResizeStart(e)}
                />

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 h-full flex flex-col px-1">
                        <div className="flex-grow overflow-auto scrollbar px-5">
                            <FormField
                                control={form.control}
                                name="to"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("to")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder="recipient@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <FormField
                                    control={form.control}
                                    name="cc"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("cc")}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="cc@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="bcc"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("bcc")}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="bcc@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem className="mt-4">
                                        <FormLabel>{t("subject")}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("subject")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="text"
                                render={({ field }) => (
                                    <FormItem className="mt-4">
                                        <FormLabel>{t("message")}</FormLabel>
                                        <FormControl>
                                            <MinimalTiptapEditor
                                                value={field.value}
                                                onChange={(value) => field.onChange(value)}
                                                className="w-full"
                                                editorContentClassName="p-5"
                                                output="html"
                                                placeholder={t("body_placeholder")}
                                                autofocus={true}
                                                editable={true}
                                                editorClassName="focus:outline-none"
                                                immediateInput={true} // Activer le traitement immédiat des entrées
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="attachments"
                                render={({ field: { value, onChange, ...fieldProps } }) => (
                                    <FormItem className="mt-4">
                                        <FormLabel>{t("attachments")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="file"
                                                multiple
                                                className="cursor-pointer"
                                                onChange={(e) => {
                                                    onChange(e.target.files)
                                                }}
                                                {...fieldProps}
                                            />
                                        </FormControl>
                                        {value && (value as FileList).length > 0 && (
                                            <FormDescription>{(value as FileList).length} file(s) selected</FormDescription>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <CardFooter className="flex justify-end px-5">
                            <Button type="submit" className="w-full mt-auto" disabled={isSubmitting || !form.formState.isValid}>
                                {isSubmitting ? t("sending") : email ? t("send_reply") : t("send_message")}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
