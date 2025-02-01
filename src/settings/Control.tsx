import {
  Box,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  SxProps,
  Theme,
  Tooltip,
} from "@mui/material";
import SettingShortcutSingleKey from "./components/SettingShortcutSingleKey";
import { useEffect, useState } from "react";
import { Config, invokeCommand } from "../util";

const listItemSx: SxProps<Theme> = {
  display: "flex",
  justifyContent: "space-between",
};

interface ModeMenuItem {
  value: string;
  text: string;
  tooltip: string;
}

// TODO: Use more user-friendly tooltip
const modeMenuItems: ModeMenuItem[] = [
  {
    value: "VerySafe",
    text: "Very safe",
    tooltip: "very safe!!",
  },
  {
    value: "Safe",
    text: "Safe",
    tooltip: "safe!!",
  },
  {
    value: "Simple",
    text: "Simple",
    tooltip: "simple!!",
  },
];

export default function Control() {
  const [ready, setReady] = useState(false);
  const [modeValue, setModeValue] = useState("VerySafe");
  const [codeShowHide, setCodeShowHide] = useState("ControlLeft");
  const [codeNextPage, setCodeNextPage] = useState("AltLeft");
  const [codePrevPage, setCodePrevPage] = useState("ShiftLeft");

  useEffect(() => {
    invokeCommand<Config>("get_config").then((config) => {
      if (typeof config === "undefined") {
        console.error(
          "Not received the config after invoking command 'get_config'"
        );
        return;
      }
      const basicConfig = config.control.basic;
      setModeValue(basicConfig.mode);
      setCodeShowHide(basicConfig.show_hide);
      setCodeNextPage(basicConfig.next_page);
      setCodePrevPage(basicConfig.prev_page);
      setReady(true);
    });
  }, []);

  const onModeChange = (event: SelectChangeEvent) => {
    setModeValue(event.target.value);
    invokeCommand("persist_basic_control", {
      key: "mode",
      value: event.target.value,
    });
  };

  const createOnChangeCode = (
    commandKey: string,
    setter: (code: string) => void
  ) => {
    return (code: string) => {
      setter(code);
      invokeCommand("persist_basic_control", { key: commandKey, value: code });
    };
  };

  if (!ready) {
    return <></>;
  }

  return (
    <Box>
      <List>
        <ListItem sx={listItemSx}>
          <ListItemText>Show/Hide mode</ListItemText>
          <Select value={modeValue} onChange={onModeChange}>
            {modeMenuItems.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                <Tooltip placement="left" title={item.tooltip}>
                  <Box sx={{ width: "100%" }}>{item.text}</Box>
                </Tooltip>
              </MenuItem>
            ))}
          </Select>
        </ListItem>

        <SettingShortcutSingleKey
          code={codeShowHide}
          onChangeCode={createOnChangeCode("show_hide", setCodeShowHide)}
        >
          Show/Hide
        </SettingShortcutSingleKey>
        <SettingShortcutSingleKey
          code={codeNextPage}
          allowWheel
          onChangeCode={createOnChangeCode("next_page", setCodeNextPage)}
        >
          Next page
        </SettingShortcutSingleKey>
        <SettingShortcutSingleKey
          code={codePrevPage}
          allowWheel
          onChangeCode={createOnChangeCode("prev_page", setCodePrevPage)}
        >
          Previous page
        </SettingShortcutSingleKey>
      </List>
    </Box>
  );
}
