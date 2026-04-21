import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import useWidth from "../hooks/useWidth";

import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import { ChevronLeftRounded, ChevronRightRounded } from "@mui/icons-material";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const PDFViewer = ({ pdf, visible, setVisible }) => {
  const width = useWidth();
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  return (
    <Dialog
      open={visible}
      onClose={() => setVisible(false)}
      fullScreen
      sx={{ overflowX: "hidden" }}
    >
      <DialogContent>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <IconButton disabled={pageNumber === 1} onClick={() => setPageNumber(pageNumber - 1)}>
            <ChevronLeftRounded fontSize="inherit" />
          </IconButton>

          <Typography variant="body1">
            Page {pageNumber}/{numPages}
          </Typography>

          <IconButton
            disabled={pageNumber === numPages}
            onClick={() => setPageNumber(pageNumber + 1)}
          >
            <ChevronRightRounded fontSize="inherit" />
          </IconButton>
        </Box>

        <Box sx={{ margin: "auto", mb: 1, display: "flex", justifyContent: "center" }}>
          <TransformWrapper wheel={{ disabled: true }}>
            <TransformComponent>
              <Box sx={{ marginLeft: "-20px" }}>
                <Document
                  file={pdf}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<CircularProgress color="primary" size={30} sx={{ ml: "20px" }} />}
                >
                  <Page
                    pageNumber={pageNumber}
                    width={Math.min(width, 920)}
                    loading={<CircularProgress color="primary" size={30} />}
                  />
                </Document>
              </Box>
            </TransformComponent>
          </TransformWrapper>
        </Box>

        <Box sx={{ textAlign: "center" }}>
          <Button variant="contained" onClick={() => setVisible(false)}>
            Reviewed
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PDFViewer;
