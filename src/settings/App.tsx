import {
  Box,
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
} from "@mui/icons-material";

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
      default:
        return null;
    }
  }, [selectedItem]);

  return (
    <Box sx={{ display: "flex" }}>
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

      <Box component="main">{mainComponent}</Box>
    </Box>
  );
}
