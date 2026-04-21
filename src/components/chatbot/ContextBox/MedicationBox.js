import React, { useState, useRef, useEffect, useContext } from "react";
import { db } from "services/firebase";
import { Graph } from "react-d3-graph";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { ChatContext } from "context/Chat";

export default function MedicationBox({
  medications,
  expanded,
  visible,
  openTab,
}) {
  const { keyword, descOpen, setDescOpen } = useContext(ChatContext);
  const [medicationDescriptions, setMedicationDescriptions] = useState([]);
  const [data, setData] = useState({});
  const [ref, setRef] = useState(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [currentMedication, setCurrentMedication] = useState();
  const boxRef = useRef(null);

  const getMedications = (list) => {
    // Have we already gotten theses medications from the database? Check to remove the duplicates
    let concatArray = [];
    medicationDescriptions.map((s) => concatArray.push(s.name));
    const toGet = list.filter((s) => !concatArray.includes(s));

    // If no diseases to fetch from the database, just update the weighting
    if (toGet.length === 0) {
      // Weight values that appear in the array multiple times as higher
      let weightedValues = {};

      list.forEach((item) => {
        // Find the name of the disease
        const name = item.toLowerCase();

        // Now write down how many keywords of this medication were parsed in the messages
        weightedValues[name] = (weightedValues[name] || 0) + 1;
      });

      let weighted = medicationDescriptions.map((item) => {
        const name = item.name.toLowerCase();

        // get the item weight, if the name exactly matches the keyword
        let itemWeight = weightedValues[name];

        return { ...item, weight: itemWeight || 1 };
      });

      setMedicationDescriptions(weighted);
      return;
    }

    // only 30 items can be parsed at once by firestore, so let's get the latest 30
    let medicationsToFetch = [...new Set(toGet)];

    if (toGet.length > 30) medicationsToFetch = toGet.reverse().splice(-30);

    db.collection("medications")
      .where("name", "in", medicationsToFetch)
      .get()
      .then((querySnapshot) => {
        let docs = [];

        querySnapshot.forEach(function (doc) {
          if (doc.data()) {
            docs.push(doc.data());
          }
        });

        // Remove duplicates
        docs = docs.filter(
          (obj1, i, arr) =>
            arr.findIndex((obj2) => obj2.name === obj1.name) === i
        );

        // Weight values that appear in the array multiple times as higher
        let weightedValues = {};

        list.forEach((item) => {
          // Find the name of the medication
          const name = item.toLowerCase();

          // Now write down how many keywords of this medication were parsed in the messages
          weightedValues[name] = (weightedValues[name] || 0) + 1;
        });

        let weighted = medicationDescriptions.concat(docs).map((item) => {
          const name = item.name.toLowerCase();

          // get the item weight, if the name exactly matches the keyword
          let itemWeight = weightedValues[name];

          return { ...item, weight: itemWeight || 1 };
        });

        setMedicationDescriptions(weighted);
      });
  };

  useEffect(() => {
    getMedications(medications);
  }, [medications]);

  useEffect(() => {
    if (keyword) {
      const match = medicationDescriptions.find(
        (d) => d.name.toLowerCase() === keyword.toLowerCase()
      );
      if (match) {
        setCurrentMedication(match);
        setDescOpen("medications");
      }
    }
  }, [keyword]);

  useEffect(() => {
    setTimeout(function () {
      setWidth(boxRef.current?.offsetWidth);
      setHeight(boxRef.current?.offsetHeight);
    }, 50);
  }, [boxRef.current, expanded, visible]);

  // All of the following is config for the d3 graph
  let config = {
    directed: false,
    automaticRearrangeAfterDropNode: true,
    collapsible: false,
    width,
    height,
    highlightDegree: 2,
    highlightOpacity: 0.2,
    linkHighlightBehavior: true,
    maxZoom: 12,
    minZoom: 0.05,
    // nodeHighlightBehavior: true, // comment this to reset nodes positions to work
    panAndZoom: false,
    staticGraph: false,
    d3: {
      alphaTarget: 0.05,
      gravity: -250,
      linkLength: 120,
      linkStrength: 2,
    },
    node: {
      color: "#117aca",
      fontColor: "black",
      fontSize: 12,
      fontWeight: "normal",
      highlightColor: "#117ACA",
      highlightFontSize: 14,
      highlightFontWeight: "bold",
      highlightStrokeColor: "#117ACA",
      highlightStrokeWidth: 1.5,
      labelProperty: (n) => (n.name ? `${n.id} - ${n.name}` : n.id),
      mouseCursor: "pointer",
      opacity: 0.9,
      renderLabel: true,
      size: 200,
      strokeColor: "none",
      strokeWidth: 1.5,
      svg: "",
      symbolType: "circle",
      viewGenerator: null,
    },
    link: {
      color: "lightgray",
      highlightColor: "#1C4685",
      mouseCursor: "pointer",
      opacity: 1,
      semanticStrokeWidth: true,
      strokeWidth: 2,
      type: "STRAIGHT",
    },
  };

  useEffect(() => {
    let preLinks = [];

    let links = preLinks.concat(
      medicationDescriptions.map((d) => {
        return { source: "", target: d.name };
      })
    );

    let preNodes = [{ id: "", size: 500 }];

    let nodes = preNodes.concat(
      medicationDescriptions.map((d) => {
        let color = "#6C7073";
        if (d.weight === 2) color = "#1B4685";
        if (d.weight >= 3) color = "#127BCB";

        let size = 100 * d.weight + 100;
        // if (d.weight === 1) size = 500;
        // if (d.weight >= 2) size = 700;

        return { id: d.name, size, color };
      })
    );

    setData({
      links,
      nodes,
    });
  }, [medicationDescriptions]);

  const onClickNode = function (nodeId) {
    const medication = medicationDescriptions.find((d) => d.name === nodeId);

    openTab("medications");
    setCurrentMedication(medication);
    setDescOpen("medications");
  };

  const handleRefChange = React.useCallback((ref) => {
    setRef(ref);
  }, []);

  return (
    <Box
      ref={boxRef}
      sx={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: visible ? "block" : "none",
      }}
    >
      {boxRef?.current?.offsetHeight ? (
        <Graph
          id="medications"
          data={data}
          config={config}
          ref={handleRefChange}
          onClickNode={onClickNode}
        />
      ) : null}
      <DescriptionBox
        medication={currentMedication}
        open={descOpen === "medications"}
        setDescOpen={setDescOpen}
      />
    </Box>
  );
}

const DescriptionBox = ({ medication, open, setDescOpen }) => {
  const handleClose = () => setDescOpen(false);

  return medication ? (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{medication.name}</DialogTitle>

      <DialogContent>
        <DialogContentText
          variant="body2"
          sx={{ whiteSpace: "pre-line", mb: 3 }}
        >
          {medication.description}
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} autoFocus>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  ) : null;
};
