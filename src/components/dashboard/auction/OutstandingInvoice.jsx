import React from "react";
import {
  Paper,
  Typography,
  Button,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import { format } from "date-fns";

const OutstandingInvoice = ({ invoice }) => {
  if (!invoice) return null;

  // Check if invoice contains ad subscriptions
  const hasAdSubscriptions = invoice.items?.some(
    (item) => item.type === "ad_subscription"
  );

  // Format amount
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  return (
    <Box sx={{ mt: 5, mb: 6 }}>
      <Typography
        variant="h5"
        component="h2"
        fontWeight="bold"
        mb={2}
        sx={{ textAlign: "center" }}
      >
        {hasAdSubscriptions
          ? "Congratulations on Winning Your Auction!"
          : "Your ZIP Code Promotion is Ready"}
      </Typography>

      <Typography variant="body1" sx={{ textAlign: "center", mb: 3 }}>
        {hasAdSubscriptions
          ? "You've successfully won the auction for one or more ZIP codes. To activate your ad subscriptions and promotions, please pay your invoice."
          : "Your ZIP code promotion is ready to go live. Please pay your invoice to activate it."}
      </Typography>

      <TableContainer
        component={Paper}
        sx={{
          mb: 3,
          "& .MuiTableCell-root": {
            borderBottom: "1px solid rgba(224, 224, 224, 0.4)",
          },
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>ZIP Code</strong>
              </TableCell>
              <TableCell>
                <strong>Description</strong>
              </TableCell>
              <TableCell>
                <strong>Type</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Amount</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoice.items?.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.zipCode}</TableCell>
                <TableCell>
                  {item.description
                    .replace(` - ZIP ${item.zipCode}`, "")
                    .replace(
                      `ZIP Code Promotion - ${item.zipCode}`,
                      `ZIP Code Promotion`
                    )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={
                      item.type === "ad_subscription"
                        ? "Ad Subscription"
                        : "Promotion"
                    }
                    color={
                      item.type === "ad_subscription" ? "primary" : "success"
                    }
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(item.amount)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} align="right" sx={{ fontWeight: "bold" }}>
                Total:
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(invoice.amount)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          color="warning"
          size="large"
          href={invoice.url}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<CreditCardIcon />}
          sx={{ px: 4 }}
        >
          Pay Invoice Now
        </Button>
      </Box>
    </Box>
  );
};

export default OutstandingInvoice;
