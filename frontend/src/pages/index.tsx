import { ModeToggle } from "@/components/ui/mode-toogle";
import { useEffect } from "react";


export default function index() {
  useEffect(() => {
    /* Example of handling messages from the WebSocket server
    const handleLoadEvents = (_event: Event) => {
    };

    const handleAddEvent = (_event: Event) => {
    }

    const handleEditEvent = (_event: Event) => {
    }

    const handleRemoveEvent = (_event: Event) => {
    }

    window.addEventListener('loadEvents', handleLoadEvents);
    window.addEventListener('eventAdded', handleAddEvent);
    window.addEventListener('eventEdited', handleEditEvent);
    window.addEventListener('eventRemoved', handleRemoveEvent);
    */

    return () => {
      /* Example of handling messages from the WebSocket server
      window.removeEventListener('loadEvents', handleLoadEvents);
      window.removeEventListener('eventAdded', handleAddEvent);
      window.removeEventListener('eventEdited', handleEditEvent);
      window.removeEventListener('eventRemoved', handleRemoveEvent);
      */
    };
  }, []);

  return (
    <section className="flex flex-col items-center justify-center h-screen">
      <section className="flex items-center justify-between w-full px-6 py-4">
        <h1 className="text-2xl font-bold text-primary">Mail</h1>
        <ModeToggle />
      </section>
    </section>
  )
}

