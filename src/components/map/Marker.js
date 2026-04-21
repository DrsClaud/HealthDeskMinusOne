import React, { useCallback, useMemo } from "react";
import ReactDOMServer from "react-dom/server";
import { Marker as LeafletMarker } from "react-leaflet";
import L from "leaflet";
import SvgMarker from "../styled/SvgMarker";

const MIN_WAIT_TIME = 15;
const MAX_WAIT_TIME = 480; // 465 + 15
const MAX_WAIT_SCORE = 360; // 3.6 * 100

const Marker = ({ data, filter, setModalOpen, setModalVisible }) => {
  const {
    title,
    averageWaitTime,
    type,
    queueEnabled,
    waitScore,
    lat,
    lng,
    users,
    rating,
    status,
    customPhone,
    hlthdsk_score,
    waitTimes,
    activeWaitTime,
  } = data;

  // Get the actual wait time to display - prefer averageWaitTime over waitScore
  const waitTimeToUse =
    averageWaitTime !== undefined ? averageWaitTime : waitScore;

  // This color funciton was used to color the markers based on the average wait time,
  // it goes from 0 to 100 but is being replaced as of KAN-671
  // const baseHue = useMemo(() => {
  //   if (averageWaitTime !== undefined) {
  //     const percentage =
  //       (averageWaitTime - MIN_WAIT_TIME) / (MAX_WAIT_TIME - MIN_WAIT_TIME);
  //     return Math.abs(percentage * 100 - 100);
  //   }
  //   if (waitScore !== undefined) {
  //     return Math.abs(waitScore / (MAX_WAIT_SCORE / 100) - 100);
  //   }
  //   return -1;
  // }, [averageWaitTime, waitScore]);

  // Returns from 0.0 to 1.0 based on either hlthdsk_score or rating
  const baseHue = useMemo(() => {
    if (type === "Emergency Department") {
      // For ERs, use rating (0-5) converted to 0-1 scale
      if (rating !== undefined) {
        return rating / 5;
      }
      // If no rating, return 0.5 for grey
      return 0.5;
    }
    // For non-ERs, use hlthdsk_score as before
    if (hlthdsk_score?.total !== undefined) {
      return hlthdsk_score.total / 100;
    }
    return 0;
  }, [hlthdsk_score, type, rating]);

  // console.log("baseHue", baseHue);

  // Function to normalize group name for URL comparison
  const normalizeForUrl = (name) => {
    if (!name) return "";
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s\-'&]/g, "") // Remove special chars but keep spaces, hyphens, apostrophes, and ampersands
      .replace(/[\s'&]+/g, "-") // Replace spaces, apostrophes, and ampersands with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  };

  // Memoize visibility check with updated filter logic
  const isVisible = useMemo(() => {
    // Handle group filter first if present - compare normalized versions
    if (filter.group && normalizeForUrl(data.group) !== filter.group)
      return false;

    // Handle emergency department case
    if (filter.facility === "emergency") {
      return (
        type === "Emergency Department" &&
        (filter.rating === 0 || data.rating >= filter.rating)
      );
    }

    // Handle urgent care case
    if (filter.facility === "clinic") {
      return type !== "Emergency Department";
    }

    return true;
  }, [filter.facility, filter.rating, filter.group, type, rating, data.group]);

  // Memoize icon creation
  const icon = useMemo(
    () =>
      new L.divIcon({
        html: ReactDOMServer.renderToString(
          <SvgMarker
            queueEnabled={queueEnabled}
            baseHue={baseHue}
            owned={!!users?.length}
            visible={isVisible}
            type={type}
          />
        ),
        iconSize: [0, 0],
      }),
    [queueEnabled, baseHue, users, isVisible, type]
  );

  // Memoize click handler
  const handleClick = useCallback(() => {
    setModalVisible(true);
    setModalOpen({
      ...data,
      phone: customPhone,
      location: { latitude: lat, longitude: lng },
      // Ensure waitTimes and activeWaitTime are passed to the modal properly
      waitTimes: waitTimes ? [...waitTimes] : undefined,
      activeWaitTime: activeWaitTime,
    });
    // Log for debugging
    console.log("Opening modal with data:", {
      title,
      hasWaitTimes: !!waitTimes,
      waitTimesCount: waitTimes?.length,
      activeWaitTime: activeWaitTime,
      averageWaitTime,
    });
  }, [
    data,
    customPhone,
    lat,
    lng,
    waitTimes,
    activeWaitTime,
    averageWaitTime,
    title,
    setModalOpen,
    setModalVisible,
  ]);

  // Only show approved facilities (or if status is not defined, assume approved)
  if (status && status !== "approved") return null;

  return isVisible ? (
    <LeafletMarker
      position={[lat, lng]}
      title={title}
      eventHandlers={{ click: handleClick }}
      icon={icon}
    />
  ) : null;
};

export default React.memo(Marker);
