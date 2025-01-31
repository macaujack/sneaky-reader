import { Box, List } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import SettingSwitch from "./components/SettingSwitch";

export default function Appearance() {
  const onUnlockReadingViewChange = (checked: boolean) => {
    if (checked) {
      callCommandWithNoParamNoReturn("start_changing_styles");
    } else {
      callCommandWithNoParamNoReturn("end_changing_styles");
      callCommandWithNoParamNoReturn("persist_position_size");
    }
  };

  return (
    <Box>
      <List>
        <SettingSwitch onChange={onUnlockReadingViewChange}>
          Unlock reading view
        </SettingSwitch>
      </List>
    </Box>
  );
}

async function callCommandWithNoParamNoReturn(command: string) {
  try {
    await invoke(command);
  } catch (e) {
    console.error(e);
  }
}
