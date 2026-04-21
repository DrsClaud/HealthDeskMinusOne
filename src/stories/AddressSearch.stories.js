import React from "react";
import { useForm } from "react-hook-form";
import { Box, Paper, Typography } from "@mui/material";
import AddressSearch from "components/AddressSearch";
import { MapboxCacheProvider } from "hooks/useMapboxCache";

export default {
  title: "Components/AddressSearch",
  component: AddressSearch,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <MapboxCacheProvider>
        <Story />
      </MapboxCacheProvider>
    ),
  ],
};

// Wrapper component to provide form context
const FormWrapper = ({ children, onSubmit, defaultValues = {} }) => {
  const methods = useForm({
    mode: "onBlur",
    defaultValues,
  });

  const handleSubmit = (data) => {
    console.log("Form submitted with data:", data);
    if (onSubmit) onSubmit(data);
  };

  return (
    <Box sx={{ width: 400, p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Address Search Component
        </Typography>
        <form onSubmit={methods.handleSubmit(handleSubmit)}>
          {React.cloneElement(children, {
            control: methods.control,
            errors: methods.formState.errors,
          })}
        </form>
        <Box sx={{ mt: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Open browser console to see form data when address is selected
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

// Default story
export const Default = () => (
  <FormWrapper>
    <AddressSearch />
  </FormWrapper>
);

// Story with error state
export const WithError = () => {
  const methods = useForm({
    mode: "onBlur",
    defaultValues: {},
  });

  // Simulate error state
  const mockErrors = {
    address: {
      message: "Facility address is required.",
    },
  };

  return (
    <Box sx={{ width: 400, p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Address Search with Error
        </Typography>
        <AddressSearch control={methods.control} errors={mockErrors} />
        <Box sx={{ mt: 2, p: 2, bgcolor: "#ffebee", borderRadius: 1 }}>
          <Typography variant="caption" color="error">
            Error state demonstration
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

// Story with pre-selected value
export const WithPreselectedValue = () => {
  const mockAddress = {
    id: "address.123",
    place_name: "123 Main Street, Austin, TX 78701, United States",
    center: [-97.7431, 30.2672],
    context: [
      { id: "postcode.123", text: "78701" },
      { id: "place.123", text: "Austin" },
    ],
  };

  return (
    <FormWrapper defaultValues={{ address: mockAddress }}>
      <AddressSearch />
    </FormWrapper>
  );
};

// Interactive playground story
export const Playground = () => {
  const methods = useForm({
    mode: "onBlur",
    defaultValues: {},
  });

  const [selectedAddress, setSelectedAddress] = React.useState(null);

  const handleSubmit = (data) => {
    setSelectedAddress(data.address);
    console.log("Selected address:", data.address);
  };

  return (
    <Box sx={{ width: 500, p: 3 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Address Search Playground
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Try searching for addresses like "123 Main Street, Austin TX" or "456
          Oak Avenue, New York NY"
        </Typography>

        <form onSubmit={methods.handleSubmit(handleSubmit)}>
          <AddressSearch
            control={methods.control}
            errors={methods.formState.errors}
          />
        </form>

        {selectedAddress && (
          <Box sx={{ mt: 3, p: 2, bgcolor: "#e8f5e8", borderRadius: 1 }}>
            <Typography variant="subtitle2" color="success.main">
              Selected Address:
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Full Address:</strong> {selectedAddress.place_name}
            </Typography>
            <Typography variant="body2">
              <strong>Coordinates:</strong>{" "}
              {selectedAddress.center?.[1]?.toFixed(4)},{" "}
              {selectedAddress.center?.[0]?.toFixed(4)}
            </Typography>
            <Typography variant="body2">
              <strong>ID:</strong> {selectedAddress.id}
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            💡 <strong>Tips:</strong>
            <br />
            • Only addresses will appear in results (no cities, countries, etc.)
            <br />
            • Results are filtered to US and AU locations only
            <br />• Search is debounced by 1 second to prevent excessive API
            calls
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
