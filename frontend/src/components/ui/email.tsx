"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { ComponentProps, useEffect, useState } from "react"
import { Buffer } from "buffer"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { useWebSocketContext } from "@/lib/websocket-context"
import { Email } from "./email-list"
import { MinimalTiptapEditor } from "../minimal-tiptap"

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
}

export default function EmailForm({
    email,
    ...props
}: EmailReplyProps & ComponentProps<"section">) {
    const { sendMessage } = useWebSocketContext()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailFormSchema),
        defaultValues: {
            to: email ? email.from : "",
            subject: email ? `Re: ${email.subject}` : "",
            text: email ? `\n\n---\n\n${email.text}` : "",
            cc: "",
            bcc: "",
            attachments: undefined,
        },
    })

    // Update form values when props change
    useEffect(() => {
        form.reset({
            to: email ? email.from : "",
            subject: email ? `Re: ${email.subject}` : "",
            text: email ? `\n\n---\n\n${email.text}` : "",
            cc: "",
            bcc: "",
            attachments: undefined,
        })
    }, [email])

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

                    {/* Body */}
                    <FormField
                        control={form.control}
                        name="text"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Body</FormLabel>
                                <FormControl>
                                    <MinimalTiptapEditor
                                        value={field.value}
                                        onChange={(value) => field.onChange(value)}
                                        className="w-full"
                                        editorContentClassName="p-5"
                                        output="html"
                                        placeholder="Enter your description..."
                                        autofocus={true}
                                        editable={true}
                                        editorClassName="focus:outline-none"
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
                        {isSubmitting ? "Sending..." : email ? "Send Reply" : "Send Email"}
                    </Button>
                </form>
            </Form>
        </section>
    )
}
