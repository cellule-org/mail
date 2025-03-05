"use client"
import { format, Locale } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"
import { enUS } from "date-fns/locale"

interface DateTimePickerProps {
    date: Date | undefined
    setDate: (date: Date) => void
    className?: string,
    locale?: Locale
}

export function DateTimePicker({ date, setDate, className, locale = enUS }: DateTimePickerProps) {
    const handleSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            const newDate = new Date(date || new Date())
            newDate.setFullYear(selectedDate.getFullYear())
            newDate.setMonth(selectedDate.getMonth())
            newDate.setDate(selectedDate.getDate())
            setDate(newDate)
        }
    }

    const handleTimeChange = (type: "hours" | "minutes", value: string) => {
        const numValue = Number.parseInt(value, 10)
        if (isNaN(numValue)) return

        const newDate = new Date(date || new Date())
        if (type === "hours" && numValue >= 0 && numValue <= 23) {
            newDate.setHours(numValue)
            setDate(newDate)
        } else if (type === "minutes" && numValue >= 0 && numValue <= 59) {
            newDate.setMinutes(numValue)
            setDate(newDate)
        }
    }

    const formatTimeValue = (value: number) => value.toString().padStart(2, "0")

    const { t } = useTranslation()

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground", className)}
                >
                    {date ? format(date, "PPp", { locale }) : <span>{t('pick_date_time')}</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar locale={locale} mode="single" selected={date} onSelect={handleSelect} initialFocus />
                <div className="p-4 border-t flex items-center justify-center space-x-2">
                    <div className="grid gap-1 text-center w-full">
                        <div className="text-sm font-medium">{
                            t('hours')
                        }</div>
                        <Input
                            type="number"
                            value={date ? formatTimeValue(date.getHours()) : ""}
                            onChange={(e) => handleTimeChange("hours", e.target.value)}
                            className="w-full"
                            min={0}
                            max={23}
                        />
                    </div>
                    <div className="text-xl pt-4">:</div>
                    <div className="grid gap-1 text-center w-full">
                        <div className="text-sm font-medium">
                            {t('minutes')}
                        </div>
                        <Input
                            type="number"
                            value={date ? formatTimeValue(date.getMinutes()) : ""}
                            onChange={(e) => handleTimeChange("minutes", e.target.value)}
                            className="w-full"
                            min={0}
                            max={59}
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

