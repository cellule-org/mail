import { useEffect, useState } from "react";


import EmailForm from "@/components/ui/email";
import { Email, EmailList } from "@/components/ui/email-list";
import EmailNav, { Mailboxes } from "@/components/ui/email-nav";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useWebSocketContext } from "@/lib/websocket-context";

import { useNavigate, useSearchParams } from "react-router";

import { useTranslation } from "react-i18next";
import * as locales from 'date-fns/locale';
import EmailViewer from "@/components/ui/email-viewer";

type LocaleKey = keyof typeof locales;

function getCookie(name: string) {
  const v = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
  return v ? v[2] : null;
}

export default function Index() {
  const { i18n } = useTranslation();
  const language = i18n.language;

  const getLocaleFromI18n = (language: string) => {
    if (locales[language as LocaleKey]) {
      return locales[language as LocaleKey];
    }

    const secondaryLanguage = language.split('-').join('');
    if (locales[secondaryLanguage as LocaleKey]) {
      return locales[secondaryLanguage as LocaleKey];
    }

    const mainKey = language.split('-')[0];
    if (locales[mainKey as LocaleKey]) {
      return locales[mainKey as LocaleKey];
    }

    console.warn(`Locale not found for language: ${language}`);

    return locales['enUS'];
  }

  const [pagination, setPagination] = useState(0);
  const { sendMessage, status } = useWebSocketContext();

  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedMail, setSelectedMail] = useState<Email | null>(null);
  const [reply, setReply] = useState(false);

  const [mailboxes, setMailboxes] = useState<Mailboxes | null>(null);

  const navigate = useNavigate();
  const [searchParams, _setSearchParams] = useSearchParams();


  useEffect(() => {
    const handleMailboxesVariables = (event: Event) => {
      const data = (event as CustomEvent).detail as {
        INBOX: string;
        SENT: string;
        DRAFTS: string;
        TRASH: string;
        SPAM: string;
      };
      setMailboxes(data)
    };

    const handleLoadMails = (event: Event) => {
      const data = (event as CustomEvent).detail as Email[];
      if (data.length === 0) {
        setLoading(true); // you're at the end of the list
        return;
      }
      setEmails((prevEmails) => {
        const newEmails = [...prevEmails, ...data];
        const uniqueEmails = Array.from(new Set(newEmails.map(email => email.mailId)))
          .map(id => newEmails.find(email => email.mailId === id) as Email);
        return uniqueEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      setLoading(false);
    };

    const handleMissingConfig = () => {
      navigate("/settings");
    }

    window.addEventListener("mailboxes_variables", handleMailboxesVariables);
    window.addEventListener("load_mails", handleLoadMails);
    window.addEventListener("missing_mail_config", handleMissingConfig);

    return () => {
      window.removeEventListener("mailboxes_variables", handleMailboxesVariables);
      window.removeEventListener("load_mails", handleLoadMails);
      window.removeEventListener("missing_mail_config", handleMissingConfig);
    };
  }, [navigate, getCookie]);

  useEffect(() => {
    if (getCookie("accessToken") && status === "open") {
      let accessToken = getCookie("accessToken");
      let refreshToken = getCookie("refreshToken");
      setTimeout(() => {
        sendMessage({ type: "user_auth", data: { accessToken, refreshToken } });
      }, 500); // Wait 500ms to ensure the server is ready
    }
  }, [navigate, sendMessage, status]);

  useEffect(() => {
    if (!getCookie("accessToken")) {
      navigate("/login");
      return;
    }
    const stringToId = (str: string) => {
      return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    if (!searchParams.has("mailbox") && mailboxes && mailboxes.INBOX) {
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

  const handleAction = (email: Email, action: "archive" | "delete" | "block" | "mark_as_read" | "mark_as_unread") => {
    sendMessage({ type: action, data: { id: email.mailId } });
    if (action === "delete" || action === "archive" || action === "block") {
      setEmails((prevEmails) => prevEmails.filter((e) => e.mailId !== email.mailId));
    }
  };

  const handleMailClick = (email: Email) => {
    handleAction(email, "mark_as_read");
    if (!email.flags?.includes("\\Seen")) {
      email.flags = [...(email.flags || []), "\\Seen"];
    }
    setSelectedMail(email);
  }

  const handleNewMail = () => {
    setSelectedMail(null);
    setReply(true);
  }

  const updateReadStatus = (email: Email, read: boolean) => {
    handleAction(email, read ? "mark_as_read" : "mark_as_unread");
    setEmails((prevEmails) =>
      prevEmails.map((e) => (e.mailId === email.mailId ? { ...e, read } : e))
    );
  };

  const handleMarkAsRead = (email: Email) => {
    updateReadStatus(email, true);
  };

  const handleMarkAsUnread = (email: Email) => {
    updateReadStatus(email, false);
  };


  const handleArchive = (email: Email) => {
    handleAction(email, "archive");
  };

  const handleDelete = (email: Email) => {
    handleAction(email, "delete");
    setSelectedMail(null);
  };

  const handleReply = (email: Email) => {
    setSelectedMail({ ...email, subject: `Re: ${email.subject}` });
    setReply(true);
  };

  const handleReplyAll = (email: Email) => {
    const recipients = Array.from(
      new Set([...(email.to || []), ...(email.cc || [])])
    ).filter((r) => r !== email.from);
    setSelectedMail({ ...email, subject: email.subject, to: recipients });
    setReply(true);
  };

  const handleForward = (email: Email) => {
    setSelectedMail({ ...email, subject: `Fwd: ${email.subject}` });
    setReply(true);
  };

  const handleCopyEmailAddress = (email: Email) => {
    navigator.clipboard.writeText(email.from);
  };

  const handleBlock = (email: Email) => {
    handleAction(email, "block");
  };

  return (
    <section className="flex flex-col items-center justify-between h-screen max-h-screen min-h-screen">
      <ResizablePanelGroup className="flex flex-row w-full h-full max-h-screen gap-1 bg-card rounded-xl shadow-lg" direction="horizontal">
        <ResizablePanel defaultSize={12} minSize={12} maxSize={20} className="min-w-fit">
          <EmailNav mailboxes={mailboxes} tags={[]} className="p-4 min-w-fit" onNewMessage={handleNewMail} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={46.25} minSize={25} maxSize={80} className="!overflow-y-auto scrollbar">
          <EmailList
            locale={getLocaleFromI18n(language)}
            className="w-full pt-4 px-4"
            emails={emails}
            onBottomReached={handleBottomReached}
            onMailClick={handleMailClick}
            onMarkAsRead={handleMarkAsRead}
            onMarkAsUnread={handleMarkAsUnread}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
            onForward={handleForward}
            onCopyEmailAddress={handleCopyEmailAddress}
            onBlock={handleBlock}
          />
        </ResizablePanel>
        {selectedMail && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={46.25} minSize={25} maxSize={68} className="!overflow-y-auto">
              <EmailViewer email={selectedMail} locale={getLocaleFromI18n(language)} onReply={handleReply} onForward={handleForward} onDelete={handleDelete} onMarkRead={handleMarkAsRead} onMarkUnread={handleMarkAsUnread} onClose={() => setSelectedMail(null)} />
            </ResizablePanel >
          </>
        )}
      </ResizablePanelGroup >
      {reply && selectedMail && (
        <EmailForm email={selectedMail} onClose={() => {
          setReply(false)
        }} />
      )}
    </section >
  )
}
