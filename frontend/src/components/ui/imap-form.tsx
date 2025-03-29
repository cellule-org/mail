"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { saveImapConfig } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

const imapFormSchema = z.object({
    host: z.string().min(1, { message: "Host is required" }),
    port: z.coerce.number().int().positive({ message: "Port must be a positive number" }),
    username: z.string().min(1, { message: "Username is required" }),
    password: z.string().min(1, { message: "Password is required" }),
    secure: z.boolean().default(true),
})

type ImapFormValues = z.infer<typeof imapFormSchema>

type ImapFormProps = {
    defaultValues?: {
        host: string;
        port: number;
        username: string;
        password: string;
        secure: boolean;
    }
}

export function ImapForm({ defaultValues }: ImapFormProps) {
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const [mailboxes, setMailboxes] = useState<string[]>([])

    const form = useForm<ImapFormValues>({
        resolver: zodResolver(imapFormSchema),
        defaultValues: defaultValues ?? {
            host: "",
            port: 993,
            username: "",
            password: "",
            secure: true,
        },
    })

    useEffect(() => {
        if (defaultValues) {
            form.reset(defaultValues)
        }
    }, [defaultValues])

    async function onSubmit(data: ImapFormValues) {
        setIsLoading(true)
        setMailboxes([]) // Reset mailboxes when submitting new config
        try {
            let result = await saveImapConfig(data) as { success: boolean, mailboxes: string[] }
            toast.success(t("notifications.imap_save_success.title"), {
                description: t("notifications.imap_save_success.message"),
            })
            if (result.mailboxes && result.mailboxes.length > 0) {
                setMailboxes(result.mailboxes)
            }
        } catch (error: any) {
            toast.error(t("notifications.imap_save_error.title"), {
                description: error.message,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="host"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("imap_form.host")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="imap.example.com" {...field} />
                                    </FormControl>
                                    <FormDescription>{t("imap_form.host_description")}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="port"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("imap_form.port")}</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormDescription>{t("imap_form.port_description")}</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("imap_form.username")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="username@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("imap_form.password")}</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="secure"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">{t("imap_form.secure_label")}</FormLabel>
                                    <FormDescription>{t("imap_form.secure_description")}</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="float-right" disabled={isLoading}>
                        {isLoading ? t("imap_form.saving") : t("imap_form.submit")}
                    </Button>
                </form>
            </Form>

            {mailboxes.length > 0 && (
                <Card className="mt-6 animate-in fade-in duration-300">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
                            {t("imap_form.available_mailboxes")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {mailboxes.map((mailbox, index) => (
                                <div
                                    key={index}
                                    className="border rounded-md p-2 bg-muted/50">
                                    {mailbox}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

