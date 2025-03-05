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
import { useEffect, useMemo, useState } from "react";
import Appearance from "./Appearance";
import Control from "./Control";
import {
  FormatColorTextOutlined,
  InfoOutlined,
  KeyboardAltOutlined,
  LibraryBooksOutlined,
} from "@mui/icons-material";
import Library from "./Library";
import { useTranslation } from "react-i18next";
import About from "./About";
import { invokeCommand } from "../util";
import { getVersion } from "@tauri-apps/api/app";

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
  {
    name: "about",
    icon: <InfoOutlined />,
  },
];

const drawerWidth = 200;

export default function App() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [isTrialVersion, setIsTrialVersion] = useState(false);
  const [version, setVersion] = useState("");
  const [selectedItem, setSelectedItem] = useState("library");

  const mainComponent = useMemo(() => {
    switch (selectedItem) {
      case "appearance":
        return <Appearance />;
      case "control":
        return <Control isTrialVersion={isTrialVersion} />;
      case "library":
        return <Library />;
      case "about":
        return <About isTrialVersion={isTrialVersion} version={version} />;
      default:
        return null;
    }
  }, [selectedItem]);

  useEffect(() => {
    const init = async () => {
      const promiseGetIsTrialVersion = invokeCommand<boolean>(
        "get_is_trial_version"
      );
      const promiseGetVersion = getVersion();
      const [isTrialVersion, version] = await Promise.all([
        promiseGetIsTrialVersion,
        promiseGetVersion,
      ]);

      if (typeof isTrialVersion === "undefined") {
        console.error(
          "Not received isTrialVersion after invoking command 'get_is_trial_version'"
        );
        return;
      }
      setIsTrialVersion(isTrialVersion);
      setVersion(version);
      setReady(true);
    };

    init();
  }, []);

  if (!ready) {
    return <></>;
  }

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
