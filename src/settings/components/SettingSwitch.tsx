import { Box, ListItem, Switch, SxProps, Theme } from "@mui/material";
import { useState } from "react";

interface Props {
  contentSx?: SxProps<Theme>;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;

  children: React.ReactNode;
}

const listItemSx: SxProps<Theme> = {
  display: "flex",
  justifyContent: "space-between",
};

export default function SettingSwitch({
  contentSx,
  defaultChecked,
  onChange,
  children,
}: Props) {
  const [checked, setChecked] = useState(defaultChecked ?? false);

  return (
    <ListItem sx={listItemSx}>
      <Box sx={contentSx}>{children}</Box>
      <Switch
        checked={checked}
        onChange={(event) => {
          setChecked(event.target.checked);
          onChange?.(event.target.checked);
        }}
      />
    </ListItem>
  );
}
