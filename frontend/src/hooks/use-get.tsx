import { useState, useEffect } from 'react'

interface ApiResponse<T = undefined> {
    data: T
    success: boolean
}

interface UseGetOptions<T> {
    url: string
    initialData?: T
    enabled?: boolean
    onSuccess?: (data: T, success: boolean) => void
    onError?: (error: Error) => void
}

export function useGet<T>({
    url,
    enabled = true,
    onSuccess,
    onError
}: UseGetOptions<T>) {
    const [data, setData] = useState<ApiResponse<T> | undefined>(undefined)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<Error | null>(null)

    const fetchData = async () => {
        if (!enabled) return

        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`)
            }

            const result = await response.json() as ApiResponse<T>
            setData(result)
            onSuccess?.(result.data, result.success)
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            setError(error)
            onError?.(error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [url, enabled])

    return {
        data,
        isLoading,
        error,
        refetch: fetchData
    }
}
