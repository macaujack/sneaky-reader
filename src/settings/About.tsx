import { Box, Link, Typography } from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTranslation } from "react-i18next";

interface Props {
  isTrialVersion: boolean;
  version: string;
}

export default function About({ isTrialVersion, version }: Props) {
  const { t } = useTranslation();

  return (
    <Box sx={{ mx: "20px", mt: "20px", userSelect: "text" }}>
      <Typography variant="h4" sx={{ mb: "30px" }}>
        Sneaky Reader
      </Typography>

      <Typography variant="body1">
        {t("version")}: {version}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography variant="body1">{t("author")}:&nbsp;</Typography>
        <Link
          variant="body1"
          onClick={() => openUrl("https://github.com/macaujack")}
          sx={{ cursor: "pointer" }}
        >
          macaujack
        </Link>
      </Box>
      <Typography variant="body1">{t("email")}: yanxfu@gmail.com</Typography>

      {isTrialVersion && (
        <Typography variant="body1" sx={{ mt: "30px" }}>
          {t("trialVersionHint")}
        </Typography>
      )}
    </Box>
  );
}
