import React, { useState } from "react";
import { db } from "services/firebase";
import { Controller, useForm } from "react-hook-form";
import {
  Backdrop,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  Radio,
  RadioGroup,
  TextField,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";

const UserProfileSettings = ({ user, data, visible, close, setSubmitted }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState();

  const onSubmit = ({ sex, age }) => {
    setLoading(true);
    setSubmitted(false);

    db.collection("users")
      .doc(user.uid)
      .update({
        profile: { sex, age },
      })
      .then(function () {
        setLoading(false);
        setSubmitted("Your personal medical profile has been updated.");
        close();
      })
      .catch(function (error) {
        setLoading(false);
        console.log(error);
      });
  };

  // If user data not loaded yet, return loading screen
  if (!data) {
    return (
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={visible}
        onClick={close}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    );
  }

  return (
    <Dialog open={visible} onClose={close}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Update Your Profile</DialogTitle>
        <DialogContent>
          <InputLabel id="sex" error={!!errors?.sex}>
            Sex
          </InputLabel>

          <Controller
            name="sex"
            control={control}
            rules={{
              required: "Sex is required.",
            }}
            defaultValue={data?.profile?.sex}
            render={({ field: { onChange, value } }) => (
              <RadioGroup
                row
                name="sex"
                value={value}
                onChange={onChange}
                defaultValue={data?.profile?.sex}
              >
                <FormControlLabel
                  value="male"
                  label="Male"
                  control={<Radio />}
                />
                <FormControlLabel
                  value="female"
                  label="Female"
                  control={<Radio />}
                />
              </RadioGroup>
            )}
          />
          {errors?.sex ? (
            <FormHelperText error={true}>{errors?.sex?.message}</FormHelperText>
          ) : null}

          <Controller
            name="age"
            control={control}
            rules={{
              required: "Age is required.",
            }}
            defaultValue={data?.profile?.age}
            render={({ field }) => (
              <TextField
                id="age"
                label="Age"
                type="number"
                InputLabelProps={{ shrink: true }}
                variant="standard"
                fullWidth
                error={!!errors?.age}
                helperText={errors?.age?.message}
                defaultValue={data?.profile?.age}
                sx={{ mt: 2 }}
                {...field}
              />
            )}
          />

          {/* {firebaseError && <Error>{firebaseError}</Error>} */}
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Close</Button>
          <LoadingButton
            loading={loading}
            type="submit"
            disabled={loading}
            autoFocus
            variant="contained"
          >
            Update Profile
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserProfileSettings;
