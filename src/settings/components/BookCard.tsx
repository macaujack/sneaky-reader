import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Fade,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { t } from "i18next";

interface Props {
  title: string;
  summary: string;
  showContextMenu?: boolean;
  onSelect?: () => void;
  onContextMenu?: () => void;
  onRename?: () => void;
  onRemove?: () => void;
}

export default function BookCard({
  title,
  summary,
  showContextMenu,
  onSelect,
  onContextMenu,
  onRename,
  onRemove,
}: Props) {
  return (
    <Box sx={{ position: "relative" }}>
      <Card
        sx={{
          userSelect: "none",
        }}
      >
        <CardActionArea onClick={onSelect} onContextMenu={onContextMenu}>
          <CardContent>
            <Typography variant="caption">{title}</Typography>
            <Typography
              variant="body1"
              sx={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 3,
                lineClamp: 3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                wordBreak: "break-word",
              }}
            >
              {summary}
            </Typography>
            {/* TODO: Add a bottom tool bar */}
          </CardContent>
        </CardActionArea>
      </Card>

      <Fade
        in={showContextMenu}
        easing={{ enter: "ease-in", exit: "step-start" }}
        unmountOnExit
      >
        <List
          disablePadding
          sx={(theme) => ({
            bgcolor: theme.palette.primary.main,
            color: theme.palette.secondary.contrastText,
            position: "absolute",
            top: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999,
          })}
        >
          <ListItem onClick={onSelect} disablePadding>
            <ListItemButton>
              <ListItemText primary={t("read")} />
            </ListItemButton>
          </ListItem>
          <ListItem onClick={onRename} disablePadding>
            <ListItemButton>
              <ListItemText primary={t("rename")} />
            </ListItemButton>
          </ListItem>
          <ListItem onClick={onRemove} disablePadding>
            <ListItemButton>
              <ListItemText primary={t("remove")} />
            </ListItemButton>
          </ListItem>
        </List>
      </Fade>
    </Box>
  );
}
