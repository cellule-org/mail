import { ModeToggle } from "@/components/ui/mode-toogle";
import { useWebSocketContext } from "@/lib/websocket-context";
import { useEffect } from "react";
import { Buffer } from 'buffer';


export default function index() {
  const { sendMessage } = useWebSocketContext();

  useEffect(() => {
    return () => {
      // Cleanup if necessary
    };
  }, []);

  return (
    <section className="flex flex-col items-center justify-center h-screen">
      <section className="flex items-center justify-between w-full px-6 py-4">
        <h1 className="text-2xl font-bold text-primary">Mailqsdqsd</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);

            const to = formData.get('to') as string;
            const subject = formData.get('subject') as string;
            const text = formData.get('text') as string;
            const cc = formData.get('cc') as string;
            const bcc = formData.get('bcc') as string;
            const ical = formData.get('ical') as string;
            const attachments = formData.getAll('attachments') as File[];

            console.log(attachments);

            const formattedAttachments = await Promise.all(attachments.map(async (attachment) => ({
              title: attachment.name,
              data: Buffer.from(await attachment.arrayBuffer()),
            })));

            console.log(formattedAttachments);

            sendMessage({
              type: 'send_email',
              data: {
                to,
                subject,
                text,
                cc,
                bcc,
                ical: ical ? JSON.parse(ical) : undefined,
                attachments: formattedAttachments,
              },
            });
          }}
        >
          <input type="email" name="to" placeholder="To" required className="mr-2 p-1 border" />
          <input type="text" name="subject" placeholder="Subject" required className="mr-2 p-1 border" />
          <textarea name="text" placeholder="Text" required className="mr-2 p-1 border"></textarea>
          <input type="email" name="cc" placeholder="CC" className="mr-2 p-1 border" />
          <input type="email" name="bcc" placeholder="BCC" className="mr-2 p-1 border" />
          <input type="text" name="ical" placeholder="iCal (JSON format)" className="mr-2 p-1 border" />
          <input type="file" name="attachments" multiple className="mr-2 p-1 border" />
          <button type="submit" className="p-1 bg-blue-500 text-white">Send</button>
        </form>
        <ModeToggle />
      </section>
    </section>
  )
}
