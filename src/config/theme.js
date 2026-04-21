import { createTheme } from "@mui/material/styles";

export const muiTheme = createTheme({
  palette: {
    primary: {
      main: "#1B4584",
    },
    secondary: {
      main: "#117ACA",
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: "text",
      },
    },
    MuiCard: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiSelect: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
  },
  typography: {
    h1: {
      fontFamily: '"Federo", sans-serif',
    },
    h2: {
      fontFamily: '"Federo", sans-serif',
    },
    h3: {
      fontFamily: '"Federo", sans-serif',
    },
    h4: {
      fontFamily: '"Federo", sans-serif',
    },
    h5: {
      fontFamily: '"Federo", sans-serif',
    },
  },
});
