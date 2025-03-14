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
import { useNavigate, useSearchParams } from "react-router";

export default function Index() {
  const [pagination, setPagination] = useState(0);
  const { sendMessage } = useWebSocketContext();

  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedMail, setSelectedMail] = useState<Email | null>(null);

  const [mailboxes, setMailboxes] = useState(() => JSON.parse(sessionStorage.getItem('mailboxes') || '{}'));

  useEffect(() => {
    const handleStorageChange = () => {
      setMailboxes(JSON.parse(sessionStorage.getItem('mailboxes') || '{}'));
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const navigate = useNavigate();
  const [searchParams, _setSearchParams] = useSearchParams();

  useEffect(() => {
    const handleLoadMails = (event: Event) => {
      const data = (event as CustomEvent).detail as Email[];
      if (data.length === 0) {
        setLoading(true); // you're at the end of the list
        return;
      }
      setEmails((prevEmails) => {
        const newEmails = [...prevEmails, ...data];
        const uniqueEmails = Array.from(new Set(newEmails.map(email => email.id)))
          .map(id => newEmails.find(email => email.id === id) as Email);
        return uniqueEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      setLoading(false);
    };

    window.addEventListener("load_mails", handleLoadMails);

    return () => {
      window.removeEventListener("load_mails", handleLoadMails);
    };
  }, []);

  useEffect(() => {
    const stringToId = (str: string) => {
      return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    if (!searchParams.has("mailbox") && mailboxes.INBOX) {
      navigate(`/?mailbox=${stringToId(mailboxes.INBOX)}`);
      return;
    }
  }, [mailboxes, searchParams]);

  const handleBottomReached = () => {
    if (emails.length === 0 || loading) {
      return;
    }
    setLoading(true);
    setPagination((prev) => prev + 1);
    sendMessage({ type: "load_mails", data: { pagination } });
  }

  const handleMailClick = (email: Email) => {
    setSelectedMail(email);
  }

  return (
    <section className="flex flex-col items-center justify-between h-screen max-h-screen min-h-screen">
      <ResizablePanelGroup className="flex flex-row w-full h-full max-h-screen gap-1 bg-card rounded-xl shadow-lg" direction="horizontal">
        <ResizablePanel defaultSize={12} minSize={12} maxSize={20}>
          <EmailNav tags={[]} className="p-4" />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={46.25} minSize={25} maxSize={68} className="!overflow-y-auto">
          <EmailList className="w-full pt-4 px-4" emails={emails} onBottomReached={handleBottomReached} onMailClick={handleMailClick} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={46.25} minSize={25} maxSize={68} className="!overflow-y-auto">
          <EmailForm className="w-full p-4" email={selectedMail} />
        </ResizablePanel >
      </ResizablePanelGroup >
    </section >
  )
}
