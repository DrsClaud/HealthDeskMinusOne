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
import "./DiseasesBox.css";
import ReactMarkdown from "react-markdown";

export default function DiseasesBox({ diseases, expanded, visible, openTab, mockDiseaseData = null }) {
  const { keyword, descOpen, setDescOpen } = useContext(ChatContext);
  const [diseaseDescriptions, setDiseaseDescriptions] = useState([]);
  const [data, setData] = useState({});
  const [ref, setRef] = useState(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [currentDisease, setCurrentDisease] = useState();
  const boxRef = useRef(null);

  const getDiseases = (list) => {
    // Have we already gotten theses diseases from the database? Check to remove the duplicates
    let concatArray = [];
    diseaseDescriptions.map((s) =>
      concatArray.push.apply(concatArray, s.match)
    );
    const toGet = list.filter((s) => !concatArray.includes(s));

    // If no diseases to fetch from the database, just update the weighting
    if (toGet.length === 0) {
      // Weight values that appear in the array multiple times as higher
      let weightedValues = {};

      list.forEach((item) => {
        // Find the name of the disease from the symptom provided
        const name = diseaseDescriptions.find((d) =>
          d.match.some((m) => m === item)
        ).name;

        // Now write down how many keywords of this disease were parsed in the messages
        weightedValues[name] = (weightedValues[name] || 0) + 1;
      });

      let weighted = diseaseDescriptions.map((item) => {
        // get the item weight, if the name exactly matches the keyword
        let itemWeight = weightedValues[item.name];

        return { ...item, weight: itemWeight || 1 };
      });

      setDiseaseDescriptions(weighted);
      return;
    }

    // If mock data, then skip firebase pls
    if (mockDiseaseData) {
      const relevantMockData = mockDiseaseData.filter(disease => 
        disease.match.some(symptom => list.includes(symptom))
      );
      
      let weightedValues = {};

      list.forEach((item) => {
        const name = relevantMockData.find((d) =>  // Get the name
          d.match.some((m) => m === item)
        )?.name;
        if (name) {
          weightedValues[name] = (weightedValues[name] || 0) + 1;
        }
      });

      let weighted = relevantMockData.map((item) => {
        let itemWeight = weightedValues[item.name];
        return { ...item, weight: itemWeight || 1 };
      });

      setDiseaseDescriptions(weighted);
      return;
    }

    // only 30 items can be parsed at once by firestore, so let's get the latest 30
    let diseasesToFetch = [...new Set(toGet)];

    if (toGet.length > 30) diseasesToFetch = toGet.reverse().splice(-30);

    db.collection("diseases")
      .where("match", "array-contains-any", diseasesToFetch)
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
          // Find the name of the disease from the symptom provided
          const name =
            docs.find((d) => d.match.some((m) => m === item))?.name ||
            docs.find((d) => d.name.toLowerCase() === item.toLowerCase());

          // Now write down how many keywords of this disease were parsed in the messages
          weightedValues[name] = (weightedValues[name] || 0) + 1;
        });

        let weighted = diseaseDescriptions.concat(docs).map((item) => {
          // get the item weight, if the name exactly matches the keyword
          let itemWeight = weightedValues[item.name];

          return { ...item, weight: itemWeight || 1 };
        });

        setDiseaseDescriptions(weighted);
      });
  };

  useEffect(() => {
    getDiseases(diseases);
  }, [diseases]);

  useEffect(() => {
    if (keyword) {
      const match = diseaseDescriptions.find((d) => {
        let lc = d.match.map((d) => d.toLowerCase());
        return lc.includes(keyword.toLowerCase());
      });
      if (match) {
        setCurrentDisease(match);
        setDescOpen("diseases");
      }
    }
  }, [keyword]);

  useEffect(() => {
    setTimeout(function () {
      setWidth(boxRef.current?.offsetWidth);
      setHeight(boxRef.current?.offsetHeight);
    }, 50);
  }, [boxRef.current, expanded, visible]);

  let config = {
    directed: false,
    automaticRearrangeAfterDropNode: true,
    collapsible: false,
    width,
    height,
    highlightDegree: 2,
    highlightOpacity: 0.2,
    linkHighlightBehavior: true,
    initialZoom: expanded ? 1 : 0.75,
    maxZoom: 12,
    minZoom: 0.75,
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
      diseaseDescriptions.map((d) => {
        return { source: "", target: d.name };
      })
    );

    let preNodes = [{ id: "", size: 500 }];

    let nodes = preNodes.concat(
      diseaseDescriptions.map((d) => {
        let color = "#6C7073";
        if (d.weight === 2) color = "#1B4685";
        if (d.weight >= 3) color = "#127BCB";

        let size = 100 * d.weight + 100;
        // if (d.weight === 2) size = 500;
        // if (d.weight >= 3) size = 700;

        return { id: d.name, size, color };
      })
    );

    setData({
      links,
      nodes,
    });
  }, [diseaseDescriptions]);

  const onClickNode = function (nodeId) {
    const disease = diseaseDescriptions.find((d) => d.name === nodeId);

    openTab("diseases");
    setCurrentDisease(disease);
    setDescOpen("diseases");
  };

  const handleRefChange = React.useCallback((ref) => {
    setRef(ref);
  }, []);

  return (
    <Box
      ref={boxRef}
      className="noselect"
      sx={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: visible ? "block" : "none",
      }}
    >
      <Graph
        id="diseases"
        data={data}
        config={config}
        ref={handleRefChange}
        onClickNode={onClickNode}
      />
      <DescriptionBox
        disease={currentDisease}
        open={descOpen === "diseases"}
        setDescOpen={setDescOpen}
      />
    </Box>
  );
}

const DescriptionBox = ({ disease, open, setDescOpen }) => {
  const handleClose = () => setDescOpen(false);

  return disease ? (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>{disease.name}</DialogTitle>

      <DialogContent>
        <DialogContentText
          variant="body2"
          sx={{ mb: 3 }}
        >
          <ReactMarkdown>
            {disease.description}
          </ReactMarkdown>
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
