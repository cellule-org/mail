import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SmtpForm } from "@/components/ui/smtp-form"
import { ImapForm } from "@/components/ui/imap-form"
import { Link } from "react-router"
import { MailboxesForm } from "@/components/ui/mailboxes-form"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

type Config = {
    smtp?: any;
    imap?: any;
    mailboxes?: any;
}

export default function SettingsPage() {
    const { t } = useTranslation()
    const [config, setConfig] = useState<Config>({})

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch("/api/settings")
                const data = await res.json()
                if (data.success) {
                    setConfig({
                        smtp: data.smtp,
                        imap: data.imap,
                        mailboxes: data.mailboxes,
                    })
                }
            } catch (error) {
                console.error("Erreur lors du chargement de la configuration", error)
            }
        }
        fetchConfig()
    }, [])

    return (
        <div className="h-fit w-full flex justify-center px-56">
            <div className="h-fit w-full max-w-5xl p-4">
                <Link to="/">
                    <a className="text-blue-500 hover:underline">{t("back_to_home")}</a>
                </Link>
                <h1 className="mb-6 text-3xl font-bold">{t("user_email_settings")}</h1>

                <Tabs defaultValue="smtp" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="smtp">{t("smtp_configuration_title")}</TabsTrigger>
                        <TabsTrigger value="imap">{t("imap_configuration_title")}</TabsTrigger>
                        <TabsTrigger value="mailboxes">{t("mailboxes_configuration_title")}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="smtp">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("smtp_configuration_title")}</CardTitle>
                                <CardDescription>{t("smtp_configuration_desc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SmtpForm defaultValues={config.smtp} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="imap">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("imap_configuration_title")}</CardTitle>
                                <CardDescription>{t("imap_configuration_desc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ImapForm defaultValues={config.imap} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="mailboxes">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("mailboxes_configuration_title")}</CardTitle>
                                <CardDescription>{t("mailboxes_configuration_desc")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MailboxesForm defaultValues={config.mailboxes} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

