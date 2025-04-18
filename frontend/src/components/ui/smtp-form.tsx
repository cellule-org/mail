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
import { saveSmtpConfig } from "@/lib/actions"

const smtpFormSchema = z.object({
    host: z.string().min(1, { message: "Host is required" }),
    port: z.coerce.number().int().positive({ message: "Port must be a positive number" }),
    username: z.string().min(1, { message: "Username is required" }),
    password: z.string().min(1, { message: "Password is required" }),
    secure: z.boolean().default(true),
})

type SmtpFormValues = z.infer<typeof smtpFormSchema>

type SmtpFormProps = {
    defaultValues?: {
        host: string;
        port: number;
        username: string;
        password: string;
        secure: boolean;
    }
}

export function SmtpForm({ defaultValues }: SmtpFormProps) {
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<SmtpFormValues>({
        resolver: zodResolver(smtpFormSchema),
        defaultValues: defaultValues ?? {
            host: "",
            port: 587,
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

    async function onSubmit(data: SmtpFormValues) {
        setIsLoading(true)
        try {
            await saveSmtpConfig(data)
            toast.success(t("notifications.smtp_save_success.title"), {
                description: t("notifications.smtp_save_success.message"),
            })
        } catch (error: any) {
            toast.error(t("notifications.smtp_save_error.title"), {
                description: error.message,
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="host"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("smtp_form.host")}</FormLabel>
                                <FormControl>
                                    <Input placeholder="smtp.example.com" {...field} />
                                </FormControl>
                                <FormDescription>{t("smtp_form.host_description")}</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="port"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t("smtp_form.port")}</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormDescription>{t("smtp_form.port_description")}</FormDescription>
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
                                <FormLabel>{t("smtp_form.username")}</FormLabel>
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
                                <FormLabel>{t("smtp_form.password")}</FormLabel>
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
                                <FormLabel className="text-base">{t("smtp_form.secure_label")}</FormLabel>
                                <FormDescription>{t("smtp_form.secure_description")}</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <Button type="submit" className="float-right" disabled={isLoading}>
                    {isLoading ? t("smtp_form.saving") : t("smtp_form.submit")}
                </Button>
            </form>
        </Form>
    )
}

