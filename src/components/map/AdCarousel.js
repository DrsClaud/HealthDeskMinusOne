import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
  Fade,
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import Slider from "react-slick";

import logo from "assets/images/logos/logo-icon.png";

// HealthDesk-branded slides to be shown ONLY when no paid ads exist
const healthdeskSlides = [
  {
    message: "Medical SuperIntelligence: Take A Stroll",
    button: "Try for Free",
    buttonClick: () => (window.location.href = "/register"),
    isBuiltIn: true,
  },
  {
    message: "Symptom Checker, with SuperIntelligence",
    button: "Try for Free",
    buttonClick: () => (window.location.href = "/register"),
    isBuiltIn: true,
  },
  {
    message:
      "<strong>One Does Not Simply</strong> - Check Out SuperIntelligence",
    button: "Try for Free",
    buttonClick: () => (window.location.href = "/register"),
    isBuiltIn: true,
  },
  {
    message: "<strong>Is It Though? - Enter your symptoms</strong>",
    button: "Try for Free",
    buttonClick: () => (window.location.href = "/register"),
    isBuiltIn: true,
  },
  {
    message: "Discuss Health Care on <strong>Your</strong> Schedule",
    button: "Try for Free",
    buttonClick: () => (window.location.href = "/register"),
    isBuiltIn: true,
  },
];

const CustomPrevArrow = ({ onClick }) => {
  const theme = useTheme();
  return (
    <IconButton
      onClick={onClick}
      size="small"
      sx={{
        position: "absolute",
        top: "50%",
        left: -36,
        transform: "translateY(-50%)",
        zIndex: 2,
        backgroundColor: "background.paper",
        boxShadow: 2,
        width: 32,
        height: 32,
        "&:hover": {
          backgroundColor: "background.paper",
          boxShadow: 4,
        },
        [theme.breakpoints.down("lg")]: {
          top: -36,
          left: 10,
          transform: "none",
        },
      }}
    >
      <ChevronLeft color="primary" fontSize="small" />
    </IconButton>
  );
};

const CustomNextArrow = ({ onClick }) => {
  const theme = useTheme();
  return (
    <IconButton
      onClick={onClick}
      size="small"
      sx={{
        position: "absolute",
        top: "50%",
        right: -36,
        transform: "translateY(-50%)",
        zIndex: 2,
        backgroundColor: "background.paper",
        boxShadow: 2,
        width: 32,
        height: 32,
        "&:hover": {
          backgroundColor: "background.paper",
          boxShadow: 4,
        },
        [theme.breakpoints.down("lg")]: {
          top: -36,
          right: "auto",
          left: 50,
          transform: "none",
        },
      }}
    >
      <ChevronRight color="primary" fontSize="small" />
    </IconButton>
  );
};

const AdSlide = ({
  image,
  message,
  buttonClick,
  buttonText,
  coordinates,
  facilityType,
  setFilter,
  website,
  isPaidAd,
  isBuiltIn,
  title,
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  const handleClick = () => {
    // Update filter if facilityType is available
    if (facilityType && setFilter) {
      setFilter((prev) => ({
        ...prev,
        facility: facilityType,
        ...(facilityType === "emergency" && { rating: 1 }),
        ...(facilityType !== "emergency" && { rating: "" }),
      }));
    }

    // Call the original buttonClick handler if it exists
    if (buttonClick) {
      buttonClick();
    }
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (isBuiltIn) {
      handleClick(); // Use the same click handler for built-in slides
    } else if (website) {
      window.open(website, "_blank");
    }
  };

  return (
    <Paper
      elevation={2}
      onClick={handleClick}
      sx={{
        display: "flex !important",
        flexDirection: { xs: "column", lg: "row" },
        alignItems: { xs: "flex-start", lg: "center" },
        cursor: "pointer",
        p: 1.25,
        borderRadius: 2,
        mb: 0.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: { xs: "100%", lg: "auto" },
          mb: { xs: isPaidAd ? 0.5 : 0, lg: 0 },
        }}
      >
        <Box
          component="img"
          src={image ? image : logo}
          alt=""
          sx={{
            maxWidth: image ? "120px" : "28px",
            maxHeight: image ? "40px" : "28px",
            width: "auto",
            height: "auto",
            mr: 1.5,
            flexShrink: 0,
            objectFit: "contain",
          }}
        />

        <Typography
          variant="caption"
          sx={{
            color: "#757575",
            fontSize: "0.75rem",
            flexShrink: 0,
            fontWeight: 500,
          }}
        >
          {isPaidAd ? "Sponsored" : "Ad"}
        </Typography>
      </Box>

      <Box
        sx={{
          flex: "1 1 auto",
          minWidth: 0,
          my: { xs: 1, lg: 0 },
          mx: { xs: 0, lg: 2 },
          order: { xs: 2, lg: 1 },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.primary.main,
            whiteSpace: "pre-line",
            lineHeight: 1.25,
          }}
          {...(isBuiltIn
            ? { dangerouslySetInnerHTML: { __html: message } }
            : { children: message })}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: { xs: "flex-start", lg: "flex-end" },
          width: { xs: "100%", lg: "auto" },
          mt: { xs: 0.75, lg: 0 },
          order: { xs: 3, lg: 2 },
          flexShrink: 0,
        }}
      >
        <Button
          variant="outlined"
          size={isDesktop ? "medium" : "small"}
          onClick={handleButtonClick}
          sx={{
            fontSize: "0.75rem",
            fontWeight: 600,
            px: 2,
            py: 0.5,
            minHeight: 30,
            textTransform: "none",
            flexShrink: 0,
          }}
        >
          {isBuiltIn ? buttonText : "Visit Site"}
        </Button>
      </Box>
    </Paper>
  );
};

const AdCarousel = ({ ads, onLocationClick, setFilter, listingsLoaded }) => {
  const [slides, setSlides] = useState([]);
  const theme = useTheme();

  const settings = {
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    speed: 500,
    dots: false,
    autoplay: true,
    autoplaySpeed: 7000,
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
  };

  useEffect(() => {
    console.log("AdCarousel: ads changed", { ads, listingsLoaded });

    // Filter for paid promotion and featured ads
    const paidAds =
      ads?.filter((ad) => ad.type === "promotion" || ad.type === "featured") ||
      [];

    console.log("AdCarousel: paidAds", paidAds);

    if (paidAds.length > 0) {
      // Convert paid ads to slide format
      const paidSlides = paidAds.map((ad) => ({
        logo: ad.logo,
        message: ad.tagline,
        button: "Visit Site",
        buttonClick: () => {
          // If coordinates exist, navigate to location
          if (ad.coordinates && onLocationClick) {
            onLocationClick(ad.coordinates);
          }
        },
        coordinates: ad.coordinates,
        facilityType: ad.facilityType,
        website: ad.website,
        title: ad.title || ad.group, // Use advertising title, fallback to group
        isPaidAd: true, // Mark as paid ad
        isBuiltIn: false, // Mark as not built-in
      }));

      // Sort by payment date (newest first) - you'll need to add paymentDate to your ad objects
      // For now, we'll use a simple shuffle to ensure fair rotation
      const shuffledSlides = paidSlides.sort(() => Math.random() - 0.5);

      // If only one paid ad, duplicate it to prevent react-slick issues
      if (shuffledSlides.length === 1) {
        setSlides([...shuffledSlides, ...shuffledSlides]);
      } else {
        setSlides(shuffledSlides);
      }
      console.log("AdCarousel: set paid slides", shuffledSlides);
    } else {
      // Only show fallback ads when no paid ads exist AND listings are loaded
      if (listingsLoaded) {
        const fallbackSlides = healthdeskSlides.map((slide) => ({
          ...slide,
          isPaidAd: false, // Mark as not paid ad
        }));
        setSlides(fallbackSlides);
        console.log("AdCarousel: set fallback slides", fallbackSlides);
      }
    }
  }, [ads, onLocationClick, listingsLoaded]);

  // Don't render carousel until listings are loaded and we have slides
  if (!listingsLoaded || slides.length === 0) {
    return null;
  }

  return (
    <Fade in={true} timeout={750}>
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          width: "calc(90% - 50px)",
          maxWidth: 860,
          mx: "auto",
          mb: 2,
          [theme.breakpoints.down("lg")]: {
            width: "calc(100% - 20px)",
            mx: 1,
            mb: 1,
          },
          "& .slick-track": {
            display: "flex",
            alignItems: "center",
          },
          "& .slick-slide": {
            padding: "0 4px",
          },
        }}
      >
        <Slider {...settings}>
          {slides.map((slide, i) => (
            <AdSlide
              key={i}
              image={slide.logo}
              buttonText={slide.button}
              buttonClick={slide.buttonClick}
              message={slide.message}
              coordinates={slide.coordinates}
              facilityType={slide.facilityType}
              setFilter={setFilter}
              website={slide.website}
              isPaidAd={slide.isPaidAd}
              isBuiltIn={slide.isBuiltIn}
              title={slide.title}
            />
          ))}
        </Slider>
      </Box>
    </Fade>
  );
};

export default AdCarousel;
