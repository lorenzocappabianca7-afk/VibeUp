function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function relyingPartyId(): string {
  if (typeof window === "undefined") return "localhost";
  return window.location.hostname || "localhost";
}

/** Human label for the platform authenticator (Face ID, Touch ID, fingerprint). */
export function getBiometricLabel(): string {
  if (typeof navigator === "undefined") return "Face ID o impronta";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "Face ID";
  if (/Mac/i.test(ua)) return "Touch ID";
  if (/Android/i.test(ua)) return "impronta digitale";
  if (/Windows/i.test(ua)) return "Windows Hello";
  return "Face ID o impronta";
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== "function") {
    return false;
  }
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function enrollBiometricCredential(input: {
  userId: string;
  email: string;
  displayName: string;
}): Promise<string> {
  if (!window.PublicKeyCredential) {
    throw new Error("Questo dispositivo non supporta Face ID o impronta.");
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(input.userId);

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: "VibeUp",
        id: relyingPartyId(),
      },
      user: {
        id: userIdBytes,
        name: input.email,
        displayName: input.displayName,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Attivazione annullata.");
  }

  return bufferToBase64Url(credential.rawId);
}

export async function assertBiometricCredential(
  credentialId: string,
): Promise<void> {
  if (!window.PublicKeyCredential) {
    throw new Error("Questo dispositivo non supporta Face ID o impronta.");
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          type: "public-key",
          id: base64UrlToBuffer(credentialId),
          transports: ["internal"],
        },
      ],
      userVerification: "required",
      timeout: 60_000,
    },
  });

  if (!assertion) {
    throw new Error("Verifica annullata.");
  }
}

export function biometricErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Verifica annullata. Riprova o usa la password.";
    }
    if (error.name === "InvalidStateError") {
      return "Face ID / impronta già configurati su questo dispositivo.";
    }
    if (error.name === "NotSupportedError") {
      return "Questo dispositivo non supporta Face ID o impronta.";
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Non riesco a usare Face ID o impronta. Usa la password.";
}
