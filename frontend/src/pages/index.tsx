import { useEffect, useState } from "react";

import EmailForm from "@/components/ui/email";
import { Email, EmailList } from "@/components/ui/email-list";
import EmailNav from "@/components/ui/email-nav";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useWebSocketContext } from "@/lib/websocket-context";

export default function Index() {
  const [pagination, setPagination] = useState(0);
  const { sendMessage } = useWebSocketContext();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleLoadMails = (event: Event) => {
      const data = (event as CustomEvent).detail as Email[];
      if (data.length === 0) {
        setLoading(true); // you're at the end of the list
        return;
      }
      setEmails((prevEmails) => [...prevEmails, ...data]);
      setLoading(false);
    };

    window.addEventListener("load_mails", handleLoadMails);

    return () => {
      window.removeEventListener("load_mails", handleLoadMails);
    };
  }, []);

  const handleBottomReached = () => {
    if (emails.length === 0 || loading) {
      return;
    }
    setLoading(true);
    setPagination((prev) => prev + 1);
    sendMessage({ type: "load_mails", data: { pagination } });
  }

  return (
    <section className="flex flex-col items-center justify-between h-screen max-h-screen min-h-screen">
      <ResizablePanelGroup className="flex flex-row w-full h-full max-h-screen px-6 gap-4 bg-card rounded-xl shadow-lg" direction="horizontal">
        <ResizablePanel defaultSize={10} minSize={10} maxSize={15}>
          <EmailNav tags={[]} className="py-4" />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={46.25} minSize={25} maxSize={68} className="!overflow-y-auto">
          <EmailList className="w-full pt-4" emails={emails} onBottomReached={handleBottomReached} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={46.25} minSize={25} maxSize={68}>
          <EmailForm className="w-full pt-4" />
        </ResizablePanel >
      </ResizablePanelGroup >
    </section >
  )
}
