import {
  Box,
  Input,
  List,
  ListItem,
  Slider,
  SxProps,
  Theme,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Config, invokeCommand } from "../util";
import { useTranslation } from "react-i18next";
import { HexAlphaColorPicker } from "react-colorful";
import { emit } from "@tauri-apps/api/event";

const listItemSx: SxProps<Theme> = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const TEXT_SIZE_MIN = 1;
const TEXT_SIZE_MAX = 50;

export default function Appearance() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [textSize, setTextSize] = useState(16);
  const [textColor, setTextColor] = useState("#1cb8c3ff");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLElement>(null);
  const colorBoxRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickPaletteOutside = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLElement)) {
        console.error("event.target is not HTMLElement");
        return;
      }
      if (
        paletteRef.current?.contains(event.target) ||
        colorBoxRef.current?.contains(event.target)
      ) {
        return;
      }
      setPaletteOpen(false);
    };

    invokeCommand<Config>("get_config").then((config) => {
      if (typeof config === "undefined") {
        console.error(
          "Not received the config after invoking command 'get_config'"
        );
        return;
      }
      const appearance = config.appearance;
      setTextSize(appearance.text_size);
      setTextColor(appearance.text_color);
      document.addEventListener("mouseup", handleClickPaletteOutside);
      invokeCommand("start_changing_styles");
      setReady(true);
    });

    return () => {
      document.removeEventListener("mouseup", handleClickPaletteOutside);
      invokeCommand("end_changing_styles");
      invokeCommand("persist_appearance");
    };
  }, []);

  const onTextSizeSliderChange = (_event: Event, value: number | number[]) => {
    setTextSize(value as number);
    emit("text-size-changed", value as number);
  };

  const onTextSizeInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newTextSize = Number(event.target.value) || 0;
    setTextSize(newTextSize);
    emit("text-size-changed", newTextSize);
  };

  const onTextSizeInputBlur = () => {
    let newTextSize = textSize;
    if (textSize < TEXT_SIZE_MIN) {
      newTextSize = TEXT_SIZE_MIN;
    } else if (textSize > TEXT_SIZE_MAX) {
      newTextSize = TEXT_SIZE_MAX;
    }
    setTextSize(newTextSize);
    emit("text-size-changed", newTextSize);
    callCommandToUpdateTextSize(newTextSize);
  };

  const onTextColorBoxClick = () => {
    setPaletteOpen((open) => !open);
  };

  const onColorSliderChange = (textColor: string) => {
    setTextColor(textColor);
    emit("text-color-changed", textColor);
  };

  const callCommandToUpdateTextSize = (textSize: number) => {
    invokeCommand("update_text_size", { textSize });
  };

  const callCommandToUpdateTextColor = (textColor: string) => {
    invokeCommand("update_text_color", { textColor });
  };

  if (!ready) {
    return <></>;
  }

  return (
    <Box>
      <List>
        <ListItem sx={listItemSx}>
          <Box>{t("textSize")}</Box>
          <Box sx={{ display: "flex" }}>
            <Slider
              value={textSize}
              onChange={onTextSizeSliderChange}
              min={TEXT_SIZE_MIN}
              max={TEXT_SIZE_MAX}
              step={1}
              shiftStep={4}
              sx={{ width: "150px" }}
              onChangeCommitted={(_, value) => {
                callCommandToUpdateTextSize(value as number);
              }}
            />

            <Input
              value={textSize}
              size="small"
              inputProps={{
                step: 1,
                min: TEXT_SIZE_MIN,
                max: TEXT_SIZE_MAX,
                type: "number",
              }}
              onChange={onTextSizeInputChange}
              onBlur={onTextSizeInputBlur}
              sx={{ ml: "30px" }}
            />
          </Box>
        </ListItem>

        <ListItem sx={listItemSx}>
          <Box>{t("textColorAndTransparency")}</Box>
          <Box
            sx={{
              padding: "8px",
              border: "2px dashed black",
              borderRadius: "5px",
              width: "75px",
              height: "50px",
              position: "relative",
            }}
          >
            <Box
              onClick={onTextColorBoxClick}
              ref={colorBoxRef}
              sx={{
                width: "100%",
                height: "100%",
                bgcolor: textColor,
                borderRadius: "5px",
                cursor: "pointer",
              }}
            />
            {paletteOpen && (
              <Box
                ref={paletteRef}
                sx={{
                  position: "absolute",
                  top: "30px",
                  left: "50px",
                  transform: "translateX(-100%)",
                }}
              >
                <HexAlphaColorPicker
                  color={textColor}
                  onChange={onColorSliderChange}
                  onMouseUp={() => callCommandToUpdateTextColor(textColor)}
                />
              </Box>
            )}
          </Box>
        </ListItem>
      </List>
    </Box>
  );
}
