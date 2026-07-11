const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_TEMPLATE_NAME =
  process.env.WHATSAPP_TEMPLATE_NAME ?? "vibeup_new_chat";
const WHATSAPP_TEMPLATE_LANGUAGE =
  process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "it";

interface WhatsAppSendResponse {
  messages?: Array<{ id: string }>;
}

function assertWhatsAppConfigured() {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    throw new Error(
      "WhatsApp non configurato: imposta WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN.",
    );
  }
}

async function sendWhatsAppPayload(payload: unknown): Promise<string> {
  assertWhatsAppConfigured();

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Invio WhatsApp fallito: ${await response.text()}`);
  }

  const body = (await response.json()) as WhatsAppSendResponse;
  const messageId = body.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp non ha restituito message id.");

  return messageId;
}

export async function sendWhatsAppTemplate(input: {
  to: string;
  userName: string;
  serviceName: string;
  previewMessage: string;
}) {
  return sendWhatsAppPayload({
    messaging_product: "whatsapp",
    to: input.to,
    type: "template",
    template: {
      name: WHATSAPP_TEMPLATE_NAME,
      language: { code: WHATSAPP_TEMPLATE_LANGUAGE },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: input.userName },
            { type: "text", text: input.serviceName },
            { type: "text", text: input.previewMessage },
          ],
        },
      ],
    },
  });
}

export async function sendWhatsAppText(input: {
  to: string;
  body: string;
}) {
  return sendWhatsAppPayload({
    messaging_product: "whatsapp",
    to: input.to,
    type: "text",
    text: {
      preview_url: false,
      body: input.body,
    },
  });
}
