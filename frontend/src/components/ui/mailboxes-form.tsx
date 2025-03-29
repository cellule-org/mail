import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { saveMailboxesConfig } from "@/lib/actions"

type MailboxesFormProps = {
    defaultValues?: {
        inbox: string;
        sent: string;
        drafts: string;
        trash: string;
        spam: string;
    }
}

const mailboxesFormSchema = z.object({
    inbox: z.string().min(1, { message: "Inbox is required" }),
    sent: z.string().min(1, { message: "Sent is required" }),
    drafts: z.string().min(1, { message: "Drafts is required" }),
    trash: z.string().min(1, { message: "Trash is required" }),
    spam: z.string().min(1, { message: "Spam is required" }),
})

type MailboxesFormValues = z.infer<typeof mailboxesFormSchema>

export function MailboxesForm({ defaultValues }: MailboxesFormProps) {
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<MailboxesFormValues>({
        resolver: zodResolver(mailboxesFormSchema),
        defaultValues: defaultValues ?? {
            inbox: "",
            sent: "",
            drafts: "",
            trash: "",
            spam: "",
        },
    })

    useEffect(() => {
        if (defaultValues) {
            form.reset(defaultValues)
        }
    }, [defaultValues])

    async function onSubmit(data: MailboxesFormValues) {
        setIsLoading(true)
        try {
            await saveMailboxesConfig(data)
            toast.success(t("notifications.mailboxes_save_success.title"), {
                description: t("notifications.mailboxes_save_success.message"),
            })
        } catch (error: any) {
            toast.error(t("notifications.mailboxes_save_error.title"), {
                description: error.message,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="inbox"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("mailboxes_form.inbox")}</FormLabel>
                            <FormControl>
                                <Input placeholder="[GMAIL]/Inbox" {...field} />
                            </FormControl>
                            <FormDescription>{t("mailboxes_form.inbox_description")}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="sent"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("mailboxes_form.sent")}</FormLabel>
                            <FormControl>
                                <Input placeholder="[GMAIL]/Sent" {...field} />
                            </FormControl>
                            <FormDescription>{t("mailboxes_form.sent_description")}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />


                <FormField
                    control={form.control}
                    name="drafts"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("mailboxes_form.drafts")}</FormLabel>
                            <FormControl>
                                <Input placeholder="[GMAIL]/Drafts" {...field} />
                            </FormControl>
                            <FormDescription>{t("mailboxes_form.drafts_description")}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="trash"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("mailboxes_form.trash")}</FormLabel>
                            <FormControl>
                                <Input placeholder="[GMAIL]/Trash" {...field} />
                            </FormControl>
                            <FormDescription>{t("mailboxes_form.trash_description")}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="spam"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t("mailboxes_form.spam")}</FormLabel>
                            <FormControl>
                                <Input placeholder="[GMAIL]/Spam" {...field} />
                            </FormControl>
                            <FormDescription>{t("mailboxes_form.spam_description")}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />


                <Button type="submit" className="float-right" disabled={isLoading}>
                    {isLoading ? t("mailboxes_form.saving") : t("mailboxes_form.submit")}
                </Button>
            </form>
        </Form>
    )
}

