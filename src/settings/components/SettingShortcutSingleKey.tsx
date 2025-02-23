import {
  Box,
  Button,
  Dialog,
  DialogContent,
  ListItem,
  SxProps,
  Theme,
  useTheme,
} from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { MouseEventHandler, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BackendKeyButtonDownInfo,
  invokeCommand,
  KeyButton,
  RdevButton,
  RdevKey,
  RdevRawKey,
} from "../../util";

interface Props {
  name: string;
  contentSx?: SxProps<Theme>;
  keyButton: KeyButton;
  onChangeKeyButton: (code: KeyButton) => void;
  allowWheel?: boolean;
  children: React.ReactNode;
}

const listItemSx: SxProps<Theme> = {
  display: "flex",
  justifyContent: "space-between",
};

export default function SettingShortcutSingleKey({
  name,
  contentSx,
  keyButton,
  onChangeKeyButton,
  allowWheel,
  children,
}: Props) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const theme = useTheme();

  const onClickButton = async () => {
    setModalOpen(true);
    await invokeCommand("update_frontend_listen_state", {
      name,
      allowWheel: typeof allowWheel === "undefined" ? false : allowWheel,
    });
  };

  const onClickDialogContent: MouseEventHandler<HTMLDivElement> = async (e) => {
    // If it's not left click, ignore.
    if (e.button !== 0) {
      return;
    }

    setModalOpen(false);
    await invokeCommand("update_frontend_listen_state", {
      name: "",
      allowWheel: false,
    });
    onChangeKeyButton({ Button: "Left" });
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const unlistenRef = { unlisten: () => {} };

    listen<BackendKeyButtonDownInfo>("key-button-down", async (event) => {
      const { name: backendName, key_button: keyButton } = event.payload;
      if (backendName !== name) {
        return;
      }
      if (keyButton !== "Escape") {
        onChangeKeyButton(keyButton);
      }
      setModalOpen(false);
      // Note here we intentionally don't invoke "update_frontend_listen_state",
      // because when backend emits "key-button-down", it has already updated
      // the frontend state
    }).then((unlisten) => {
      unlistenRef.unlisten = unlisten;
    });

    return () => {
      unlistenRef.unlisten();
    };
  }, []);

  return (
    <ListItem sx={listItemSx}>
      <Box sx={contentSx}>{children}</Box>
      <Button
        variant="text"
        onClick={onClickButton}
        style={{ textTransform: "none" }}
      >
        {keyButtonToString(keyButton)}
      </Button>

      <Dialog
        sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
        open={modalOpen}
        onClose={async () => {
          setModalOpen(false);
          await invokeCommand("update_frontend_listen_state", {
            name: "",
            allowWheel: false,
          });
        }}
      >
        <DialogContent
          onClick={onClickDialogContent}
          sx={{
            borderRadius: "10px",
            padding: "50px",
            bgcolor: theme.palette.background.default,
          }}
        >
          <Box>{t("pressAKeyToSet")}</Box>
          <Box>{t("pressEscToCancel")}</Box>
        </DialogContent>
      </Dialog>
    </ListItem>
  );
}

function keyButtonToString(keyButton: KeyButton): string {
  if (typeof keyButton === "string") {
    return keyButton;
  }

  if ((keyButton as RdevKey).Key !== undefined) {
    const key = (keyButton as RdevKey).Key;
    if (typeof key === "string") {
      return key;
    }
    if (typeof (key as { Unknown: number }).Unknown === "number") {
      // TODO: Handle some keys that are actually known
      return `UnknownKey(${(key as { Unknown: number }).Unknown})`;
    }
    if ((key as { RawKey: RdevRawKey }).RawKey !== undefined) {
      const rawKey = (key as { RawKey: RdevRawKey }).RawKey;
      const scanCode = (rawKey as { ScanCode: number }).ScanCode;
      if (typeof scanCode === "number") {
        return `ScanCode(${scanCode})`;
      }
      const winVirtualKeycode = (rawKey as { WinVirtualKeycode: number })
        .WinVirtualKeycode;
      if (typeof winVirtualKeycode === "number") {
        return `WinVirtualKeycode(${winVirtualKeycode})`;
      }
      const linuxXorgKeycode = (rawKey as { LinuxXorgKeycode: number })
        .LinuxXorgKeycode;
      if (typeof linuxXorgKeycode === "number") {
        return `LinuxXorgKeycode(${linuxXorgKeycode})`;
      }
      const linuxConsoleKeycode = (rawKey as { LinuxConsoleKeycode: number })
        .LinuxConsoleKeycode;
      if (typeof linuxConsoleKeycode === "number") {
        return `LinuxConsoleKeycode(${linuxConsoleKeycode})`;
      }
      const macVirtualKeycode = (rawKey as { MacVirtualKeycode: number })
        .MacVirtualKeycode;
      if (typeof macVirtualKeycode === "number") {
        return `MacVirtualKeycode(${macVirtualKeycode})`;
      }
    }
  }

  if ((keyButton as RdevButton).Button !== undefined) {
    const button = (keyButton as RdevButton).Button;
    if (typeof button === "string") {
      return `Mouse${button}`;
    }
    if (typeof (button as { Unknown: number }).Unknown === "number") {
      // TODO: Add some buttons that are actually known
      const unknown = (button as { Unknown: number }).Unknown;
      return `UnknownButton(${unknown})`;
    }
  }

  console.error("Unhandled KeyButton", keyButton);
  return "UnhandledKeyButton";
}
