import React from 'react';

import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { CalendarEvent, useCalendar } from '@/components/ui/full-calendar';

import { format } from 'date-fns';

import { useTranslation } from 'react-i18next';
import { useWebSocketContext } from '@/lib/websocket-context';

interface RemoveEventModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    event: CalendarEvent | null;
}

export const RemoveEventModal: React.FC<RemoveEventModalProps> = ({
    isOpen,
    onOpenChange,
    event,
}) => {
    const { sendMessage } = useWebSocketContext();

    const { locale } = useCalendar();
    const { t } = useTranslation();

    const handleDelete = () => {
        if (!event) {
            return;
        }
        sendMessage({
            type: 'remove_event',
            data: {
                id: event.id,
            },
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger className='hidden'></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('remove_event')}</DialogTitle>
                    <DialogDescription>
                        {format(new Date(event?.start || new Date()), 'PPPP', { locale })}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-8">
                    <p>{t('confirm_delete')}</p>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                        >
                            {t('delete')}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
