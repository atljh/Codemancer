import { useState, useCallback, useRef, useEffect } from "react";
import type {
  TelegramDialog,
  TelegramMessage,
  TelegramMedia,
  CommsAuthState,
} from "../types/game";
import { useGameStore } from "../stores/gameStore";

// GramJS types — loaded dynamically to avoid top-level Buffer crash
type TelegramClientType = import("telegram").TelegramClient;
type StringSessionType = import("telegram/sessions").StringSession;

const SESSION_KEY = "tg_session";

let client: TelegramClientType | null = null;

// Lazy-load GramJS only when needed (after Buffer polyfill is active)
async function loadGramJS() {
  const { TelegramClient } = await import("telegram");
  const { StringSession } = await import("telegram/sessions");
  return { TelegramClient, StringSession };
}

// Convert Telegram entities to markdown syntax
function entitiesToMarkdown(
  text: string,
  entities?: Array<{
    className: string;
    offset: number;
    length: number;
    url?: string;
    language?: string;
  }>,
): string {
  if (!entities || entities.length === 0) return text;

  // Sort by offset descending so replacements don't shift earlier offsets
  const sorted = [...entities].sort((a, b) => {
    if (b.offset !== a.offset) return b.offset - a.offset;
    return b.length - a.length;
  });

  let result = text;
  for (const entity of sorted) {
    const start = entity.offset;
    const end = start + entity.length;
    const substr = result.slice(start, end);

    let replacement = substr;
    const cn = entity.className;

    if (cn === "MessageEntityBold") {
      replacement = `**${substr}**`;
    } else if (cn === "MessageEntityItalic") {
      replacement = `*${substr}*`;
    } else if (cn === "MessageEntityCode") {
      replacement = `\`${substr}\``;
    } else if (cn === "MessageEntityPre") {
      const lang = entity.language || "";
      replacement = `\n\`\`\`${lang}\n${substr}\n\`\`\`\n`;
    } else if (cn === "MessageEntityTextUrl" && entity.url) {
      replacement = `[${substr}](${entity.url})`;
    } else if (cn === "MessageEntityStrike" || cn === "MessageEntityStrikethrough") {
      replacement = `~~${substr}~~`;
    } else if (cn === "MessageEntityBlockquote") {
      replacement = "\n> " + substr.replace(/\n/g, "\n> ") + "\n";
    }
    // MessageEntityUrl — leave as-is, remark-gfm auto-links bare URLs
    // MessageEntityMention, MessageEntityHashtag — keep as-is
    // MessageEntityUnderline — no markdown equivalent, keep text

    result = result.slice(0, start) + replacement + result.slice(end);
  }

  return result;
}

// Extract media info from a GramJS message without downloading
function getMediaInfo(m: any): TelegramMedia | undefined {
  if (!m.media) return undefined;

  const cn = m.media.className;

  if (cn === "MessageMediaPhoto") {
    return { type: "photo" };
  }

  if (cn === "MessageMediaDocument") {
    const doc = m.media.document;
    if (!doc) return undefined;
    const mime: string = doc.mimeType || "";
    const attrs: any[] = doc.attributes || [];
    const fileNameAttr = attrs.find(
      (a: any) => a.className === "DocumentAttributeFilename",
    );

    if (mime === "image/gif" || attrs.some((a: any) => a.className === "DocumentAttributeAnimated")) {
      return { type: "gif", mimeType: mime };
    }
    if (mime.startsWith("video/")) {
      return { type: "video", mimeType: mime, fileName: fileNameAttr?.fileName };
    }
    if (mime.startsWith("audio/") || attrs.some((a: any) => a.className === "DocumentAttributeAudio")) {
      return { type: "voice", mimeType: mime, fileName: fileNameAttr?.fileName };
    }
    if (mime === "image/webp" || attrs.some((a: any) => a.className === "DocumentAttributeSticker")) {
      return { type: "sticker", mimeType: mime };
    }

    return {
      type: "document",
      mimeType: mime,
      fileName: fileNameAttr?.fileName || "file",
    };
  }

  if (cn === "MessageMediaWebPage" && m.media.webpage) {
    const wp = m.media.webpage;
    return {
      type: "webpage",
      webpageTitle: wp.title || undefined,
      webpageDescription: wp.description?.slice(0, 200) || undefined,
      webpageUrl: wp.url || undefined,
    };
  }

  return undefined;
}

export function useTelegram() {
  const [authState, setAuthState] = useState<CommsAuthState>("disconnected");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const settings = useGameStore((s) => s.settings);
  const setCommsConnected = useGameStore((s) => s.setCommsConnected);
  const setCommsDialogs = useGameStore((s) => s.setCommsDialogs);
  const setCommsMessages = useGameStore((s) => s.setCommsMessages);

  const codeResolveRef = useRef<((v: string) => void) | null>(null);
  const passwordResolveRef = useRef<((v: string) => void) | null>(null);

  const hasCredentials = !!(
    settings.telegram_api_id && settings.telegram_api_hash
  );

  const getClient = useCallback(async () => {
    if (client) return client;
    const { TelegramClient, StringSession } = await loadGramJS();
    const sessionStr = localStorage.getItem(SESSION_KEY) || "";
    const session = new StringSession(sessionStr);
    const apiId = parseInt(settings.telegram_api_id, 10);
    const apiHash = settings.telegram_api_hash;
    client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      deviceModel: "Codemancer Desktop",
      systemVersion: "1.0",
      appVersion: "1.0",
      useWSS: true,
    });
    return client;
  }, [settings.telegram_api_id, settings.telegram_api_hash]);

  const saveSession = useCallback(async () => {
    if (client) {
      const sessionStr = (client.session as StringSessionType).save();
      localStorage.setItem(SESSION_KEY, sessionStr);
    }
  }, []);

  const markConnected = useCallback(() => {
    setAuthState("connected");
    setCommsConnected(true);
    saveSession();
  }, [setCommsConnected, saveSession]);

  // Auto-connect if session exists
  useEffect(() => {
    if (!hasCredentials) return;
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return;

    let cancelled = false;
    (async () => {
      try {
        const c = await getClient();
        await c.connect();
        if (cancelled) return;
        if (await c.isUserAuthorized()) {
          markConnected();
        }
      } catch {
        // session expired or invalid
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCredentials]);

  const initClient = useCallback(async () => {
    if (!hasCredentials) return;
    const c = await getClient();
    await c.connect();
    if (await c.isUserAuthorized()) {
      markConnected();
    }
  }, [hasCredentials, getClient, markConnected]);

  const startPhoneAuth = useCallback(
    async (phone: string) => {
      if (!hasCredentials) return;
      const c = await getClient();
      if (!c.connected) await c.connect();

      setAuthState("code_pending");

      try {
        await c.start({
          phoneNumber: () => Promise.resolve(phone),
          phoneCode: () =>
            new Promise<string>((resolve) => {
              codeResolveRef.current = resolve;
            }),
          password: () => {
            setAuthState("password_pending");
            return new Promise<string>((resolve) => {
              passwordResolveRef.current = resolve;
            });
          },
          onError: ((_err: Error) => true) as unknown as (
            err: Error,
          ) => Promise<boolean>,
        });
        markConnected();
      } catch {
        setAuthState("disconnected");
      }
    },
    [hasCredentials, getClient, markConnected],
  );

  const submitPhoneCode = useCallback((code: string) => {
    codeResolveRef.current?.(code);
    codeResolveRef.current = null;
  }, []);

  const submitPassword = useCallback((pw: string) => {
    passwordResolveRef.current?.(pw);
    passwordResolveRef.current = null;
  }, []);

  const startQrAuth = useCallback(async () => {
    if (!hasCredentials) return;
    const c = await getClient();
    if (!c.connected) await c.connect();
    setAuthState("qr_pending");

    try {
      await c.signInUserWithQrCode(
        {
          apiId: parseInt(settings.telegram_api_id, 10),
          apiHash: settings.telegram_api_hash,
        },
        {
          qrCode: async (code) => {
            const token = Buffer.from(code.token)
              .toString("base64")
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, "");
            setQrUrl(`tg://login?token=${token}`);
          },
          password: async () => {
            setAuthState("password_pending");
            return new Promise<string>((resolve) => {
              passwordResolveRef.current = resolve;
            });
          },
          onError: async (err) => {
            console.warn("[COMMS] QR auth error:", err?.message || err);
            return true;
          },
        },
      );
      markConnected();
    } catch (err) {
      console.error("[COMMS] QR auth failed:", err);
      setAuthState((prev) => (prev === "qr_pending" ? "disconnected" : prev));
    }
  }, [
    hasCredentials,
    getClient,
    settings.telegram_api_id,
    settings.telegram_api_hash,
    markConnected,
  ]);

  const fetchDialogs = useCallback(async () => {
    if (!client || authState !== "connected") return;
    try {
      const dialogs = await client.getDialogs({ limit: 50 });
      const mapped: TelegramDialog[] = dialogs.map((d) => ({
        id: d.id?.toString() ?? "",
        title: d.title ?? "Unknown",
        unreadCount: d.unreadCount ?? 0,
        isUser: d.isUser ?? false,
        isGroup: d.isGroup ?? false,
        isChannel: d.isChannel ?? false,
        lastMessage: (d.message?.message ?? "").slice(0, 100),
        lastMessageDate: d.message?.date ?? 0,
      }));
      setCommsDialogs(mapped);
    } catch {
      // error fetching dialogs
    }
  }, [authState, setCommsDialogs]);

  const fetchMessages = useCallback(
    async (dialogId: string) => {
      if (!client || authState !== "connected") return;
      try {
        const c = client;
        const entity = await c.getEntity(dialogId);
        const rawMsgs = await c.getMessages(entity, { limit: 50 });

        // Phase 1: map messages with entity→markdown conversion + media info
        const mapped: TelegramMessage[] = rawMsgs.map((m: any) => ({
          id: m.id,
          senderId: String(m.senderId ?? ""),
          senderName:
            m.sender && "firstName" in m.sender
              ? String(
                  (m.sender as unknown as Record<string, unknown>).firstName ??
                    "",
                )
              : "",
          text: entitiesToMarkdown(m.message || "", m.entities),
          date: m.date ?? 0,
          out: m.out ?? false,
          media: getMediaInfo(m),
        }));

        setCommsMessages(mapped);

        // Phase 2: download photos/stickers/gifs in background
        const downloadable = rawMsgs.filter(
          (m: any) =>
            m.media &&
            (m.media.className === "MessageMediaPhoto" ||
              (m.media.className === "MessageMediaDocument" &&
                m.media.document &&
                (m.media.document.mimeType?.startsWith("image/") ||
                  m.media.document.attributes?.some(
                    (a: any) => a.className === "DocumentAttributeSticker",
                  )))),
        );

        if (downloadable.length > 0) {
          const MAX_DOWNLOADS = 20;
          const toDownload = downloadable.slice(0, MAX_DOWNLOADS);

          const results = await Promise.allSettled(
            toDownload.map(async (m: any) => {
              try {
                const buffer = await c.downloadMedia(m.media, {});
                if (buffer && buffer instanceof Buffer) {
                  const mime =
                    m.media.className === "MessageMediaPhoto"
                      ? "image/jpeg"
                      : m.media.document?.mimeType || "image/png";
                  const b64 = buffer.toString("base64");
                  return { id: m.id, url: `data:${mime};base64,${b64}` };
                }
              } catch {
                // download failed for this message
              }
              return null;
            }),
          );

          const urlMap = new Map<number, string>();
          for (const r of results) {
            if (r.status === "fulfilled" && r.value) {
              urlMap.set(r.value.id, r.value.url);
            }
          }

          if (urlMap.size > 0) {
            // Check that the user hasn't navigated away
            const currentDialog =
              useGameStore.getState().commsActiveDialogId;
            if (currentDialog === dialogId) {
              const current = useGameStore.getState().commsMessages;
              const updated = current.map((msg) => {
                const url = urlMap.get(msg.id);
                if (url && msg.media) {
                  return { ...msg, media: { ...msg.media, url } };
                }
                return msg;
              });
              setCommsMessages(updated);
            }
          }
        }
      } catch {
        // error fetching messages
      }
    },
    [authState, setCommsMessages],
  );

  const disconnect = useCallback(async () => {
    if (client) {
      try {
        await client.destroy();
      } catch {
        /* ignore */
      }
      client = null;
    }
    localStorage.removeItem(SESSION_KEY);
    setAuthState("disconnected");
    setCommsConnected(false);
    setCommsDialogs([]);
    setCommsMessages([]);
    setQrUrl(null);
  }, [setCommsConnected, setCommsDialogs, setCommsMessages]);

  return {
    authState,
    qrUrl,
    hasCredentials,
    initClient,
    startPhoneAuth,
    submitPhoneCode,
    submitPassword,
    startQrAuth,
    fetchDialogs,
    fetchMessages,
    disconnect,
  };
}
