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

interface DrawerItem {
  name: string;
  icon: JSX.Element;
}

const drawerItems: DrawerItem[] = [
  {
    name: "Appearance",
    icon: <FormatColorTextOutlined />,
  },
  {
    name: "Control",
    icon: <KeyboardAltOutlined />,
  },
  {
    name: "Library",
    icon: <LibraryBooksOutlined />,
  },
];

const drawerWidth = 200;

export default function App() {
  const [selectedItem, setSelectedItem] = useState("Appearance");

  const mainComponent = useMemo(() => {
    switch (selectedItem) {
      case "Appearance":
        return <Appearance />;
      case "Control":
        return <Control />;
      case "Library":
        return <Library />;
      default:
        return null;
    }
  }, [selectedItem]);

  return (
    <Box sx={{ display: "flex" }}>
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
                  <ListItemText primary={item.name} />
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
