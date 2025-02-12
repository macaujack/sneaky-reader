import { Box, List } from "@mui/material";
import SettingSwitch from "./components/SettingSwitch";
import { useEffect } from "react";
import { invokeCommand } from "../util";
import { useTranslation } from "react-i18next";

export default function Appearance() {
  const { t } = useTranslation();

  const onUnlockReadingViewChange = (checked: boolean) => {
    if (checked) {
      invokeCommand("start_changing_styles");
    } else {
      invokeCommand("end_changing_styles");
      invokeCommand("persist_position_size");
    }
  };

  useEffect(() => {
    return () => {
      invokeCommand("end_changing_styles");
      invokeCommand("persist_position_size");
    };
  }, []);

  return (
    <Box>
      <List>
        <SettingSwitch onChange={onUnlockReadingViewChange}>
          {t("adjustReadingWindow")}
        </SettingSwitch>
      </List>
    </Box>
  );
}
