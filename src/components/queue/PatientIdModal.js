import React, { useState } from "react";
import { styled } from "@mui/material/styles";
import { db } from "services/firebase";
import { format, fromUnixTime, differenceInMinutes } from "date-fns";
import ModalGeneric from "../ModalGeneric";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import { RotateLeftRounded, RotateRightRounded } from "@mui/icons-material";

const ImageHover = styled('div')(({ theme, background_image, rotation, zoomed_position, $showZoomedImage }) => ({
  height: '100%',
  minWidth: '100%',
  background: 'rgba(255, 255, 255, 0.8)',
  backgroundImage: `url(${background_image})`,
  backgroundRepeat: 'no-repeat',
  transform: `scale(1.7) rotate(${rotation}deg)`,
  position: 'absolute',
  display: $showZoomedImage ? 'initial' : 'none',
  zIndex: 5000,
  backgroundPosition: zoomed_position ? `-${zoomed_position[0]}px -${zoomed_position[1]}px` : 0,
}));

const PatientIdModal = ({ patient, visible, setVisible }) => {
  const [showZoomedImage, setShowZoomedImage] = useState(false);
  const [zoomedPosition, setZoomedPosition] = useState([0, 0]);
  const [imageRotation, setImageRotation] = useState(0);

  return (
    <Dialog
      open={visible}
      onClose={() => setVisible(false)}
      maxWidth={patient?.photoId ? "lg" : "sm"}
      fullWidth
    >
      <DialogTitle>Patient Information</DialogTitle>

      <DialogContent>
        <Typography variant="subtitle2">Phone Number</Typography>
        <Typography variant="body">{patient.phone}</Typography>

        {patient?.photoId ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              ID
            </Typography>

            <Box sx={{ mt: 1, mb: 1 }}>
              <IconButton onClick={() => setImageRotation(imageRotation - 90)}>
                <RotateLeftRounded fontSize="inherit" />
              </IconButton>

              <IconButton onClick={() => setImageRotation(imageRotation + 90)}>
                <RotateRightRounded fontSize="inherit" />
              </IconButton>
            </Box>

            <ImageHover
              onClick={() => setShowZoomedImage(false)}
              background_image={patient.photoId}
              rotation={imageRotation}
              zoomed_position={zoomedPosition}
              $showZoomedImage={showZoomedImage}
              id="box"
            />

            <img
              style={{
                minWidth: "100%",
                transform: "rotate(" + imageRotation + "deg)",
              }}
              src={patient.photoId}
              onClick={(e) => {
                let xPos = e.clientX - 75,
                  yPos = e.clientY - 75;
                setShowZoomedImage(true);
                setZoomedPosition([xPos, yPos]);
              }}
            />
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={() => {
            setVisible(false);
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PatientIdModal;
