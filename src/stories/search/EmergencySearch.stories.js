import React from "react";
import { useForm } from "react-hook-form";
import { http } from "msw";
import EmergencySearch from "../../components/EmergencySearch";
import { Box, Typography, Button } from "@mui/material";

// Mock emergency department data
const mockEmergencyDepartments = [
  {
    id: "1",
    name: "general hospital",
    city: "new york",
    state: "NY",
    zip: "10001",
    objectID: "1",
  },
  {
    id: "2",
    name: "mercy medical center",
    city: "atlanta",
    state: "GA",
    zip: "30301",
    objectID: "2",
  },
  {
    id: "3",
    name: "saint mary's hospital",
    city: "chicago",
    state: "IL",
    zip: "60601",
    objectID: "3",
  },
  {
    id: "4",
    name: "university hospital",
    city: "los angeles",
    state: "CA",
    zip: "90210",
    objectID: "4",
  },
  {
    id: "5",
    name: "children's hospital",
    city: "boston",
    state: "MA",
    zip: "02101",
    objectID: "5",
  },
];

// Mock handlers for different scenarios
const getSearchHandlers = (scenario = "default") => {
  const baseUrl =
    "https://3exoagrby5-dsn.algolia.net/1/indexes/emergencydepartments/query";

  switch (scenario) {
    case "loading":
      return [
        http.post(baseUrl, (req, res, ctx) => {
          return res(
            ctx.delay(2000),
            ctx.json({
              hits: [],
              nbHits: 0,
              page: 0,
              nbPages: 0,
              hitsPerPage: 20,
              exhaustiveNbHits: true,
              exhaustiveTypo: true,
              query: "",
              params: "",
              processingTimeMS: 1000,
            })
          );
        }),
      ];

    case "no-results":
      return [
        http.post(baseUrl, (req, res, ctx) => {
          return res(
            ctx.json({
              hits: [],
              nbHits: 0,
              page: 0,
              nbPages: 0,
              hitsPerPage: 20,
              exhaustiveNbHits: true,
              exhaustiveTypo: true,
              query: "nonexistent hospital",
              params: "",
              processingTimeMS: 1,
            })
          );
        }),
      ];

    case "error":
      return [
        http.post(baseUrl, (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              message: "Internal server error",
              status: 500,
            })
          );
        }),
      ];

    case "filtered":
      return [
        http.post(baseUrl, (req, res, ctx) => {
          const body = JSON.parse(req.body);
          const query = body.query.toLowerCase();

          const filteredHits = mockEmergencyDepartments.filter(
            (dept) =>
              dept.name.toLowerCase().includes(query) ||
              dept.city.toLowerCase().includes(query) ||
              dept.state.toLowerCase().includes(query)
          );

          return res(
            ctx.json({
              hits: filteredHits,
              nbHits: filteredHits.length,
              page: 0,
              nbPages: 1,
              hitsPerPage: 20,
              exhaustiveNbHits: true,
              exhaustiveTypo: true,
              query: query,
              params: "",
              processingTimeMS: 10,
            })
          );
        }),
      ];

    default:
      return [
        http.post(baseUrl, (req, res, ctx) => {
          return res(
            ctx.json({
              hits: mockEmergencyDepartments,
              nbHits: mockEmergencyDepartments.length,
              page: 0,
              nbPages: 1,
              hitsPerPage: 20,
              exhaustiveNbHits: true,
              exhaustiveTypo: true,
              query: "",
              params: "",
              processingTimeMS: 10,
            })
          );
        }),
      ];
  }
};

// Form wrapper to provide react-hook-form context
const FormWrapper = ({ children, onSubmit = () => {}, defaultValues = {} }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues,
  });

  const watchedValues = watch();

  return (
    <Box>
      <form onSubmit={handleSubmit(onSubmit)}>
        {children({ control, errors })}

        <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
          <Button type="submit" variant="contained">
            Submit
          </Button>
          <Button type="button" variant="outlined">
            Reset
          </Button>
        </Box>
      </form>

      <Box sx={{ mt: 3, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Form Values (for debugging):
        </Typography>
        <pre style={{ fontSize: "12px", margin: 0 }}>
          {JSON.stringify(watchedValues, null, 2)}
        </pre>
      </Box>
    </Box>
  );
};

export default {
  title: "Search/EmergencySearch",
  component: EmergencySearch,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    onSubmit: { action: "submitted" },
  },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: 600, margin: "0 auto", p: 2 }}>
        <Story />
      </Box>
    ),
  ],
};

// Default story with results
export const Default = {
  parameters: {
    msw: {
      handlers: getSearchHandlers("default"),
    },
  },
  render: (args) => (
    <FormWrapper onSubmit={args.onSubmit}>
      {({ control, errors }) => (
        <EmergencySearch control={control} errors={errors} />
      )}
    </FormWrapper>
  ),
};

// Loading state
export const Loading = {
  parameters: {
    msw: {
      handlers: getSearchHandlers("loading"),
    },
  },
  render: (args) => (
    <FormWrapper onSubmit={args.onSubmit}>
      {({ control, errors }) => (
        <EmergencySearch control={control} errors={errors} />
      )}
    </FormWrapper>
  ),
};

// No results
export const NoResults = {
  parameters: {
    msw: {
      handlers: getSearchHandlers("no-results"),
    },
  },
  render: (args) => (
    <FormWrapper onSubmit={args.onSubmit}>
      {({ control, errors }) => (
        <EmergencySearch control={control} errors={errors} />
      )}
    </FormWrapper>
  ),
};

// Error state
export const Error = {
  parameters: {
    msw: {
      handlers: getSearchHandlers("error"),
    },
  },
  render: (args) => (
    <FormWrapper onSubmit={args.onSubmit}>
      {({ control, errors }) => (
        <EmergencySearch control={control} errors={errors} />
      )}
    </FormWrapper>
  ),
};

// Filtered results (simulates typing)
export const FilteredResults = {
  parameters: {
    msw: {
      handlers: getSearchHandlers("filtered"),
    },
  },
  render: (args) => (
    <FormWrapper onSubmit={args.onSubmit}>
      {({ control, errors }) => (
        <EmergencySearch control={control} errors={errors} />
      )}
    </FormWrapper>
  ),
};

// With validation errors
export const WithValidationErrors = {
  parameters: {
    msw: {
      handlers: getSearchHandlers("default"),
    },
  },
  render: (args) => (
    <FormWrapper onSubmit={args.onSubmit}>
      {({ control, errors }) => (
        <EmergencySearch
          control={control}
          errors={{
            emergency_location: {
              message: "Facility address is required.",
            },
          }}
        />
      )}
    </FormWrapper>
  ),
};

// With pre-selected value
export const WithPreselectedValue = {
  parameters: {
    msw: {
      handlers: getSearchHandlers("default"),
    },
  },
  render: (args) => (
    <FormWrapper
      onSubmit={args.onSubmit}
      defaultValues={{
        emergency_location: mockEmergencyDepartments[0],
      }}
    >
      {({ control, errors }) => (
        <EmergencySearch control={control} errors={errors} />
      )}
    </FormWrapper>
  ),
};

// Interactive playground
export const Playground = {
  parameters: {
    msw: {
      handlers: getSearchHandlers("filtered"),
    },
  },
  render: (args) => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Emergency Search Playground
      </Typography>
      <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
        Try searching for: "general", "mercy", "chicago", "CA", etc.
        <br />
        <strong>Test freeSolo:</strong> Type something and then click away
        without selecting - your text should remain!
      </Typography>

      <FormWrapper onSubmit={args.onSubmit}>
        {({ control, errors }) => (
          <EmergencySearch control={control} errors={errors} />
        )}
      </FormWrapper>
    </Box>
  ),
};

// Test freeSolo behavior specifically
export const FreeSoloTest = {
  parameters: {
    msw: {
      handlers: getSearchHandlers("filtered"),
    },
  },
  render: (args) => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Free Text Input Test
      </Typography>
      <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
        <strong>Steps to test:</strong>
        <br />
        1. Type "My Custom Hospital" in the field
        <br />
        2. Click somewhere else (don't select from dropdown)
        <br />
        3. Your text should remain in the field!
        <br />
        4. Check the form values below to see both strings and objects work
      </Typography>

      <FormWrapper onSubmit={args.onSubmit}>
        {({ control, errors }) => (
          <EmergencySearch control={control} errors={errors} />
        )}
      </FormWrapper>
    </Box>
  ),
};

// Test improved behavior
export const ImprovedBehaviorTest = {
  parameters: {
    msw: {
      handlers: getSearchHandlers("filtered"),
    },
  },
  render: (args) => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Improved Behavior Test
      </Typography>
      <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
        <strong>Fixed issues to test:</strong>
        <br />
        1. <strong>Empty dropdown:</strong> Click input - should show "Start
        typing to search..." (no random entries)
        <br />
        2. <strong>Debouncing:</strong> Type "general hospital" quickly - uses
        use-debounce library
        <br />
        3. <strong>Backspace fix:</strong> Backspace rapidly - no more ApiError
        <br />
        4. <strong>Clean UX:</strong> Only shows results when you actually type
        something
      </Typography>

      <FormWrapper onSubmit={args.onSubmit}>
        {({ control, errors }) => (
          <EmergencySearch control={control} errors={errors} />
        )}
      </FormWrapper>
    </Box>
  ),
};
