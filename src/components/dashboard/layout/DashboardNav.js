import React, { useState, useEffect } from "react";
import { styled, useTheme } from "@mui/material/styles";
import {
  Box,
  Drawer as MuiDrawer,
  CssBaseline,
  AppBar as MuiAppBar,
  Toolbar,
  IconButton,
  Divider,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useNavigate } from "react-router-dom";
import Logo from "components/styled/Logo";
import StatusBanner from "components/dashboard/StatusBanner";
import { useAuth } from "hooks/useAuth";
import { DrawerContext } from "context/DrawerContext";
import {
  OnboardingDrawer,
  PatientDrawer,
  ProfessionalDrawer,
  FacilityDrawer,
  SettingsDrawer,
  AdminDrawer,
  ChartMindManagerDrawer,
  GlobalAdminDrawer,
  RegionalAdminDrawer,
} from "./DrawerComponents";
import { isPatientFamilyRole } from "constants/roles";

const drawerWidth = 300;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: "#fff",
  boxShadow: "none",
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  ...(!open && {
    width: `calc(100% - ${theme.spacing(7)} - 1px)`,
    [theme.breakpoints.up("sm")]: {
      width: `calc(100% - ${theme.spacing(8)} - 1px)`,
    },
  }),
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  "& .MuiDrawer-paper": {
    ...(open ? openedMixin(theme) : closedMixin(theme)),
  },
  ...(open ? openedMixin(theme) : closedMixin(theme)),
}));

const DashboardNav = ({ children }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));
  const {
    user,
    subscription,
    userData,
    activeSubscriptionRole,
    logout,
    isGlobalAdmin,
    isRegionalAdmin,
  } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleDrawerClose = () => {
    setIsClosing(true);
    setMobileOpen(false);
  };

  const handleDrawerTransitionEnd = () => {
    setIsClosing(false);
  };

  const handleDrawerToggle = () => {
    if (!isClosing) {
      setMobileOpen(!mobileOpen);
    }
  };

  const handleDesktopDrawerOpen = () => setDrawerOpen(true);
  const handleDesktopDrawerClose = () => setDrawerOpen(false);

  const drawerExpanded = isDesktop ? drawerOpen : mobileOpen;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  useEffect(() => {
    const handleScroll = (e) => {
      const scrollTop = e.target.scrollTop;
      setIsScrolled(scrollTop > 10);
    };

    const mainContent = document.querySelector("[data-main-content]");
    if (mainContent) {
      mainContent.addEventListener("scroll", handleScroll);
      return () => mainContent.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // User is verified if email verified OR phone verified
  const isVerified = user?.emailVerified || userData?.phoneVerified;

  const drawer = (
    <DrawerContext.Provider value={drawerExpanded}>
      <DrawerHeader
        sx={{
          justifyContent: drawerOpen ? "space-between" : "flex-end",
          px: 2,
        }}
      >
        {drawerOpen && (
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <Logo />
          </Box>
        )}
        <IconButton
          aria-label={drawerOpen ? "collapse drawer" : "expand drawer"}
          onClick={
            isDesktop
              ? drawerOpen
                ? handleDesktopDrawerClose
                : handleDesktopDrawerOpen
              : handleDrawerToggle
          }
          sx={{
            ml: drawerOpen ? 0 : "auto",
            display: { xs: "none", sm: "inline-flex" },
          }}
        >
          {theme.direction === "rtl" ? (
            drawerOpen ? (
              <ChevronRightIcon />
            ) : (
              <ChevronLeftIcon />
            )
          ) : drawerOpen ? (
            <ChevronLeftIcon />
          ) : (
            <MenuIcon />
          )}
        </IconButton>
        <Box
          sx={{ display: { xs: "flex", sm: "none" }, alignItems: "center" }}
        >
          <IconButton
            aria-label="close drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Logo />
        </Box>
      </DrawerHeader>
      <Divider />
      <div onClick={isDesktop ? undefined : handleDrawerToggle}>
        {isGlobalAdmin ? (
          <GlobalAdminDrawer onLogout={handleLogout} />
        ) : isRegionalAdmin ? (
          <RegionalAdminDrawer onLogout={handleLogout} />
        ) : (
          <>
            {userData?.role === "facility" && isVerified && (
              <FacilityDrawer
                activeSubscriptionRole={activeSubscriptionRole}
                userData={userData}
              />
            )}

            {isPatientFamilyRole(userData?.role) && isVerified && (
              <PatientDrawer subscription={subscription} userData={userData} />
            )}

            {userData?.role === "professional" && isVerified && (
              <ProfessionalDrawer
                subscription={subscription}
                userData={userData}
              />
            )}

            {userData?.role === "admin" && isVerified && (
              <ChartMindManagerDrawer />
            )}

            {isVerified ? (
              <>
                <AdminDrawer isGlobalAdmin={isGlobalAdmin} />
                <SettingsDrawer
                  activeSubscriptionRole={activeSubscriptionRole}
                  userData={userData}
                />
              </>
            ) : null}

            <OnboardingDrawer logout={handleLogout} />
          </>
        )}
      </div>
    </DrawerContext.Provider>
  );

  const closedDrawerWidth = `calc(${theme.spacing(8)} + 1px)`;
  const mainWidth = isDesktop
    ? drawerOpen
      ? `calc(100% - ${drawerWidth}px)`
      : `calc(100% - ${closedDrawerWidth})`
    : "100%";

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        open={isDesktop && drawerOpen}
        sx={{
          display: { xs: "block", sm: "block" },
          boxShadow: "none",
          transition: "box-shadow 0.3s ease-in-out",
          ...(isScrolled && {
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }),
          ...(!isDesktop && {
            width: "100%",
            marginLeft: 0,
            zIndex: theme.zIndex.appBar,
          }),
        }}
      >
        <Toolbar sx={{ display: { xs: "flex", sm: "none" } }}>
          <IconButton
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: { sm: "none" } }}>
            <Logo />
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <MuiDrawer
          variant="temporary"
          open={mobileOpen}
          onTransitionEnd={handleDrawerTransitionEnd}
          onClose={handleDrawerClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </MuiDrawer>
        <Drawer
          variant="permanent"
          open={drawerOpen}
          sx={{
            display: { xs: "none", sm: "block" },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        data-main-content
        sx={{
          flexGrow: 1,
          margin: "auto",
          p: 3,
          paddingTop: { xs: "56px", sm: 0 },
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          width: mainWidth,
          height: "100dvh",
          overflow: "auto",
          position: "relative",
        }}
      >
        <StatusBanner />
        {children}
      </Box>
    </Box>
  );
};

export default DashboardNav;
