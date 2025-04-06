/**
 * Extract a cookie value from a cookie header
 */
export const getCookie = (cookieHeader: string | undefined, name: string): string | null => {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';').map(v => v.trim());
    for (const cookie of cookies) {
        const [key, value] = cookie.split('=');
        if (key === name) return value;
    }
    return null;
};
