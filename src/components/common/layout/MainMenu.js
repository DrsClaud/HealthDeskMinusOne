import React, { useState } from "react";
import { styled } from "@mui/material/styles";
import NavListItem from "../NavListItem";
import MenuIcon from "@mui/icons-material/Menu";
import {
  DescriptionRounded,
  ExploreRounded,
  // ImageSearchRounded,
  PsychologyRounded,
  SensorsRounded,
  VerifiedUserRounded,
} from "@mui/icons-material";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  Typography,
} from "@mui/material";

const MenuButton = () => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      <IconButton onClick={() => setShowMenu(true)}>
        <MenuIcon />
      </IconButton>
      <MainMenu open={showMenu} close={() => setShowMenu(false)} />
    </>
  );
};

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1, 2),
  ...theme.mixins.toolbar,
}));

const MainMenu = ({ open, close }) => {
  return (
    <Drawer open={open} onClose={close}>
      <DrawerHeader sx={{ alignItems: "center" }}>
        <IconButton
          aria-label="open drawer"
          edge="start"
          onClick={close}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
      </DrawerHeader>

      <Divider />

      <List sx={{ width: 300 }}>
        <NavListItem
          icon={<ExploreRounded />}
          text="CareMap"
          secondary="For Healthcare Organizations"
          link="/auth?role=facility"
        />

        <NavListItem
          icon={<SensorsRounded />}
          text="SymptomSense"
          secondary="For Patients"
          link="/auth?role=patient"
        />

        <NavListItem
          icon={<PsychologyRounded />}
          text="ChartMind"
          secondary="For Healthcare Providers"
          link="/auth?role=provider"
        />
      </List>

      <Box sx={{ position: "absolute", bottom: 0, width: 300 }}>
        <List dense disablePadding>
          <NavListItem
            icon={<DescriptionRounded />}
            text="Terms of Use"
            link="/terms-of-use"
          />
          <NavListItem
            icon={<VerifiedUserRounded />}
            text="Privacy Policy"
            link="/privacy-policy"
          />
        </List>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, mb: 2, px: 2, display: "block" }}
        >
          This site is protected by reCAPTCHA and the Google{" "}
          <Link href="https://policies.google.com/privacy">Privacy Policy</Link>{" "}
          and{" "}
          <Link href="https://policies.google.com/terms">Terms of Service</Link>{" "}
          apply.
        </Typography>
      </Box>
    </Drawer>
  );
};

export default MenuButton;
