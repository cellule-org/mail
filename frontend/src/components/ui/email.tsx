"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ComponentProps, useEffect, useState } from "react"
import { Buffer } from "buffer"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useWebSocketContext } from "@/lib/websocket-context"

const emailFormSchema = z.object({
    to: z.string().email({ message: "Please enter a valid email address" }),
    subject: z.string().min(1, { message: "Subject is required" }),
    text: z.string().min(1, { message: "Message is required" }),
    cc: z.string().email({ message: "Please enter a valid email address" }).optional().or(z.literal("")),
    bcc: z.string().email({ message: "Please enter a valid email address" }).optional().or(z.literal("")),
    ical: z.string().optional().or(z.literal("")),
    attachments: z.any().optional(),
})

type EmailFormValues = z.infer<typeof emailFormSchema>

export interface EmailReplyProps {
    to?: string;
    subject?: string;
    originalText?: string;
    cc?: string;
    bcc?: string;
    isReply?: boolean;
}

export default function EmailForm({
    to = "",
    subject = "",
    originalText = "",
    cc = "",
    bcc = "",
    isReply = false,
    ...props
}: EmailReplyProps & ComponentProps<"section">) {
    const { sendMessage } = useWebSocketContext()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const formattedSubject = isReply && !subject.startsWith("Re:") ? `Re: ${subject}` : subject

    const formattedText = isReply && originalText ?
        `\n\n---------- Original Message ----------\n${originalText}` :
        ""

    const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailFormSchema),
        defaultValues: {
            to,
            subject: formattedSubject,
            text: formattedText,
            cc,
            bcc,
            ical: "",
            attachments: undefined,
        },
    })

    // Update form values when props change
    useEffect(() => {
        form.reset({
            to,
            subject: formattedSubject,
            text: formattedText,
            cc,
            bcc,
            ical: "",
            attachments: undefined,
        })
    }, [to, formattedSubject, formattedText, cc, bcc, form])

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
                ical: data.ical ? JSON.parse(data.ical) : undefined,
                attachments: formattedAttachments,
            }

            sendMessage({
                type: "send_email",
                data: emailData,
            })
        } catch (error) {
            console.error("Error sending email:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <section {...props}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="to"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>To</FormLabel>
                                <FormControl>
                                    <Input placeholder="recipient@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="cc"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>CC</FormLabel>
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
                                    <FormLabel>BCC</FormLabel>
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
                            <FormItem>
                                <FormLabel>Subject</FormLabel>
                                <FormControl>
                                    <Input placeholder="Email subject" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="text"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Message</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Your message here..." className="min-h-[120px]" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="ical"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>iCal (JSON format)</FormLabel>
                                <FormControl>
                                    <Input placeholder='{"start":"2023-01-01T10:00:00Z","end":"2023-01-01T11:00:00Z"}' {...field} />
                                </FormControl>
                                <FormDescription>Optional calendar event in JSON format</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="attachments"
                        render={({ field: { value, onChange, ...fieldProps } }) => (
                            <FormItem>
                                <FormLabel>Attachments</FormLabel>
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

                    <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isValid}>
                        {isSubmitting ? "Sending..." : isReply ? "Send Reply" : "Send Email"}
                    </Button>
                </form>
            </Form>
        </section>
    )
}
