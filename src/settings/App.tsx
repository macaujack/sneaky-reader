import {
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { useMemo, useState } from "react";
import Appearance from "./Appearance";
import Control from "./Control";
import {
  FormatColorTextOutlined,
  KeyboardAltOutlined,
  LibraryBooksOutlined,
} from "@mui/icons-material";
import Library from "./Library";
import { useTranslation } from "react-i18next";

interface DrawerItem {
  name: string;
  icon: JSX.Element;
}

const drawerItems: DrawerItem[] = [
  {
    name: "library",
    icon: <LibraryBooksOutlined />,
  },
  {
    name: "appearance",
    icon: <FormatColorTextOutlined />,
  },
  {
    name: "control",
    icon: <KeyboardAltOutlined />,
  },
];

const drawerWidth = 200;

export default function App() {
  const { t } = useTranslation();
  const [selectedItem, setSelectedItem] = useState("library");

  const mainComponent = useMemo(() => {
    switch (selectedItem) {
      case "appearance":
        return <Appearance />;
      case "control":
        return <Control />;
      case "library":
        return <Library />;
      default:
        return null;
    }
  }, [selectedItem]);

  return (
    <Box sx={{ display: "flex", userSelect: "none" }}>
      <CssBaseline />

      <Box sx={{ width: drawerWidth }}>
        <Drawer variant="permanent" anchor="left" sx={{ width: drawerWidth }}>
          <List sx={{ width: drawerWidth }}>
            {drawerItems.map((item) => (
              <ListItem key={item.name} disablePadding>
                <ListItemButton
                  selected={item.name === selectedItem}
                  onClick={() => setSelectedItem(item.name)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={t(item.name)} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
      </Box>

      <Box component="main" sx={{ width: "100%" }}>
        {mainComponent}
      </Box>
    </Box>
  );
}
