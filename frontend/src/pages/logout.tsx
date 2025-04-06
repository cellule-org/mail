import { useEffect } from "react";
import { useNavigate } from "react-router";
import { setCookie } from "./login";

export default function LogoutPage() {
    const navigate = useNavigate();

    useEffect(() => {
        setCookie("accessToken", "", new Date(0));
        setCookie("refreshToken", "", new Date(0));
        setCookie("userId", "", new Date(0));
        navigate('/login');
    }, [navigate]);

    return (
        <></>
    );
}    