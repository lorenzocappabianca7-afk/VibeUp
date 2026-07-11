import { MessageCircle, Sparkles } from "lucide-react";
import { memo } from "react";

const placeholderMessages = [
  {
    sender: "Villa Aurora",
    message: "Ciao! Abbiamo disponibilita' per la data richiesta.",
    time: "2 min fa",
    unread: true,
  },
  {
    sender: "DJ Marco Beats",
    message: "Posso preparare una playlist per compleanno o laurea.",
    time: "1 ora fa",
    unread: true,
  },
  {
    sender: "Assistente IA VibeUp",
    message: "Ho trovato 3 servizi esterni adatti al tuo evento.",
    time: "Ieri",
    unread: false,
  },
];

export const MessagesScreen = memo(function MessagesScreen() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-black">Messaggi</h1>
        <p className="mt-1 text-sm text-primary-black/60">
          Chat con location, fornitori e assistente IA
        </p>
      </header>

      <ul className="space-y-2">
        {placeholderMessages.map((message) => (
          <li
            key={message.sender}
            className={`flex gap-3 rounded-2xl border p-4 transition-colors ${
              message.unread
                ? "border-brand-teal/20 bg-brand-teal/5"
                : "border-primary-black/8 bg-background"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                message.unread
                  ? "bg-brand-teal/15 text-brand-teal"
                  : "bg-primary-black/5 text-primary-black/50"
              }`}
            >
              {message.sender.includes("IA") ? (
                <Sparkles className="h-5 w-5" aria-hidden />
              ) : (
                <MessageCircle className="h-5 w-5" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-primary-black">
                  {message.sender}
                </p>
                {message.unread && (
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-pink"
                    aria-label="Non letta"
                  />
                )}
              </div>
              <p className="mt-0.5 text-sm text-primary-black/60">
                {message.message}
              </p>
              <p className="mt-1 text-xs text-primary-black/40">
                {message.time}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-center gap-2 py-4 text-primary-black/40">
        <MessageCircle className="h-4 w-4" aria-hidden />
        <p className="text-xs">Le tue conversazioni appariranno qui</p>
      </div>
    </div>
  );
});
