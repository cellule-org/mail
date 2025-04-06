import { useState } from "react"
import { toast } from "sonner"

interface UsePostOptions<_TData, TResponse> {
    url: string
    onSuccess?: (data: TResponse) => void
    onError?: (error: Error) => void
}

export function usePost<TData, TResponse>({ url, onSuccess, onError }: UsePostOptions<TData, TResponse>) {
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<Error | null>(null)
    const [data, setData] = useState<TResponse | null>(null)

    const mutate = async (payload: TData) => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`)
            }

            const result = await response.json() as TResponse
            setData(result)
            onSuccess?.(result)
            return result
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            setError(error)
            if (onError) {
                onError(error)
            } else {
                console.error("Error in usePost:", error)
                toast.error("An error occurred while processing your request.")
            }
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    return {
        mutate,
        isLoading,
        error,
        data,
    }
}

