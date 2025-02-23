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
import { Config, invokeCommand, KeyButton } from "../util";
import { useTranslation } from "react-i18next";

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
    text: "verySafeOption",
    tooltip: "verySafeExplain",
  },
  {
    value: "Safe",
    text: "safeOption",
    tooltip: "safeExplain",
  },
  {
    value: "Simple",
    text: "simpleOption",
    tooltip: "simpleExplain",
  },
];

export default function Control() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [modeValue, setModeValue] = useState("VerySafe");
  const [kbShowHide, setKbShowHide] = useState<KeyButton>("");
  const [kbNextPage, setKbNextPage] = useState<KeyButton>("");
  const [kbPrevPage, setKbPrevPage] = useState<KeyButton>("");

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
      setKbShowHide(basicConfig.show_hide);
      setKbNextPage(basicConfig.next_page);
      setKbPrevPage(basicConfig.prev_page);
      setReady(true);
    });
  }, []);

  const onModeChange = (event: SelectChangeEvent) => {
    setModeValue(event.target.value);
    invokeCommand("persist_basic_control_mode", {
      mode: event.target.value,
    });
  };

  const createOnChangeCode = (
    name: string,
    setter: (keyButton: KeyButton) => void
  ) => {
    return (keyButton: KeyButton) => {
      setter(keyButton);
      invokeCommand("persist_basic_control_key_button", { name, keyButton });
    };
  };

  if (!ready) {
    return <></>;
  }

  return (
    <Box>
      <List>
        <ListItem sx={listItemSx}>
          <ListItemText>{t("showHideMode")}</ListItemText>
          <Select value={modeValue} onChange={onModeChange}>
            {modeMenuItems.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                <Tooltip placement="left" title={t(item.tooltip)}>
                  <Box sx={{ width: "100%" }}>{t(item.text)}</Box>
                </Tooltip>
              </MenuItem>
            ))}
          </Select>
        </ListItem>

        <SettingShortcutSingleKey
          name="show_hide"
          keyButton={kbShowHide}
          onChangeKeyButton={createOnChangeCode("show_hide", setKbShowHide)}
        >
          {t("showHide")}
        </SettingShortcutSingleKey>
        <SettingShortcutSingleKey
          name="next_page"
          keyButton={kbNextPage}
          allowWheel
          onChangeKeyButton={createOnChangeCode("next_page", setKbNextPage)}
        >
          {t("nextPage")}
        </SettingShortcutSingleKey>
        <SettingShortcutSingleKey
          name="prev_page"
          keyButton={kbPrevPage}
          allowWheel
          onChangeKeyButton={createOnChangeCode("prev_page", setKbPrevPage)}
        >
          {t("prevPage")}
        </SettingShortcutSingleKey>
      </List>
    </Box>
  );
}
