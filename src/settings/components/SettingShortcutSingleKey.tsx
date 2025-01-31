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
import { KeyboardEvent, MouseEvent, useState, WheelEvent } from "react";

interface Props {
  contentSx?: SxProps<Theme>;
  code: string;
  onChangeCode: (code: string) => void;
  allowWheel?: boolean;
  children: React.ReactNode;
}

const listItemSx: SxProps<Theme> = {
  display: "flex",
  justifyContent: "space-between",
};

export default function SettingShortcutSingleKey({
  contentSx,
  code,
  onChangeCode,
  allowWheel,
  children,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const theme = useTheme();

  const keyEventHandler = (event: KeyboardEvent<HTMLDivElement>) => {
    setModalOpen(false);
    if (event.code !== "Escape") {
      onChangeCode(event.code);
    }
  };
  const mouseEventHandler = (event: MouseEvent<HTMLDivElement>) => {
    let name = "";
    switch (event.button) {
      case 0:
        name = "MouseL";
        break;
      case 1:
        name = "MouseM";
        break;
      case 2:
        name = "MouseR";
        break;
      case 3:
        name = "Mouse4";
        break;
      case 4:
        name = "Mouse5";
        break;
      default:
        name = "MouseUnknown";
    }
    setModalOpen(false);
    onChangeCode(name);
  };
  const wheelEventHandler = (event: WheelEvent<HTMLDivElement>) => {
    const deltas = [
      [Math.abs(event.deltaY), 0],
      [Math.abs(event.deltaX), 1],
      [Math.abs(event.deltaZ), 2],
    ];
    deltas.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : b[0] - a[0]));

    let delta, axis;
    if (deltas[0][1] === 0) {
      delta = event.deltaY;
      axis = "y";
    } else if (deltas[0][1] === 1) {
      delta = event.deltaX;
      axis = "x";
    } else {
      delta = event.deltaZ;
      axis = "z";
    }
    setModalOpen(false);
    onChangeCode(`Wheel${delta >= 0 ? "+" : "-"}${axis}`);
  };

  return (
    <ListItem sx={listItemSx}>
      <Box sx={contentSx}>{children}</Box>
      <Button
        variant="text"
        onClick={() => {
          setModalOpen(true);
        }}
        style={{ textTransform: "none" }}
      >
        {code}
      </Button>

      <Dialog
        onKeyDown={keyEventHandler}
        sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
        }}
      >
        <DialogContent
          onMouseDown={mouseEventHandler}
          onWheel={allowWheel ? wheelEventHandler : undefined}
          sx={{
            borderRadius: "10px",
            padding: "50px",
            bgcolor: theme.palette.background.default,
          }}
        >
          <Box>Press a key to set</Box>
          <Box>Press "ESC" to cancel</Box>
        </DialogContent>
      </Dialog>
    </ListItem>
  );
}
