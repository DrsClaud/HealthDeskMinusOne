import { Link as RouterLink } from "react-router-dom";
import { Grid, Link } from "@mui/material";

const NavigationLinks = ({ facility }) => (
  <>
    <Grid container>
      <Grid item xs>
        <Link component={RouterLink} to="/" underline="none" variant="body2">
          Return to Map
        </Link>
      </Grid>
      <Grid item>
        <Link
          component={RouterLink}
          to="/auth"
          underline="none"
          variant="body2"
        >
          Already have an account? Log in
        </Link>
      </Grid>
    </Grid>

    {/* Temporarily disabled according to: KAN-683 */}
    {/* {facility && (
      <Grid container sx={{ mt: 2 }}>
        <Grid item xs>
          <Link
            href="https://md3c.com/customize"
            underline="none"
            variant="body2"
            sx={{ fontWeight: "bold" }}
          >
            Promote Your Organization First (Learn More)
          </Link>
        </Grid>
      </Grid>
    )} */}
  </>
);

export default NavigationLinks;
