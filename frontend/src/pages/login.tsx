import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { ArrowRight, Lock } from "lucide-react";
import { useWebSocketContext } from "@/lib/websocket-context";
import { useTranslation } from "react-i18next";

export function setCookie(name: string, value: string, expires: Date) {
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/`;
}

export function getCookie(name: string) {
    const v = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
    return v ? v[2] : null;
}

export default function LoginPage() {
    const { sendMessage } = useWebSocketContext();
    const navigate = useNavigate();
    const [searchParams, _setSearchParams] = useSearchParams();

    const { t } = useTranslation();

    useEffect(() => {
        if (getCookie("accessToken")) {
            navigate("/");
        }
    }, [navigate]);

    useEffect(() => {
        if (searchParams.has("access_token")) {
            const accessToken = searchParams.get("access_token") as string;
            const refreshToken = searchParams.get("refresh_token") as string;
            const userId = searchParams.get("user_id") as string;

            const accessExpiry = new Date(searchParams.get("access_expiry") as string);
            const refreshExpiry = new Date(searchParams.get("refresh_expiry") as string);

            setCookie("accessToken", accessToken, accessExpiry);
            setCookie("refreshToken", refreshToken, refreshExpiry);
            setCookie("userId", userId, refreshExpiry);
            sendMessage({ type: "user_auth", data: { accessToken, refreshToken } });
            navigate("/");
            return;
        }
    }, [searchParams, navigate, sendMessage]);

    useEffect(() => {
        if (getCookie("accessToken")) {
            navigate("/");
        } else {
            const refreshToken = getCookie("refreshToken");
            if (refreshToken) {
                sendMessage({ type: "auth_refresh", data: { refreshToken } });
            }
        }
    }, [sendMessage]);

    const goToLogin = () => {
        const externalLoginUrl = `${process.env.CORE_PUBLIC_URL || process.env.CORE_LOCAL_URL || "http://localhost:3000"}/api/auth/external/login`;

        const redirectTo = `${externalLoginUrl}?redirect_to=${encodeURIComponent(window.location.origin)}`

        window.location.href = redirectTo;
    }

    return (
        <section className="flex items-center justify-center h-screen">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 dark:bg-primary/20 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">
                        {t("login_title")}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {t("login_description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-muted/50 dark:bg-muted/30 p-3 rounded-lg text-sm">
                        <p className="text-foreground/80 dark:text-foreground/70 text-center">
                            {t("redirect_info")}
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={goToLogin} className="w-full group transition-all cursor-pointer" size="lg">
                        {t("login_button")}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </CardFooter>
            </Card>
        </section>
    );
};