import React from "react";
import ModalGeneric from "components/ModalGeneric";
import Button from "components/styled/Button";

const EligibilitySelect = ({
  register,
  showPatientModal,
  setShowPatientModal,
}) => (
  <ModalGeneric width={"500px"} visible={showPatientModal}>
    <p>Please enter your age and check all that apply.</p>
    <label>
      Age <input type="number" name="age" ref={register} /> and up
    </label>
    <label>
      <input type="checkbox" name="conditions" ref={register} />
      Patients with one or more of the following: Obesity (BMI&gt;30), Type 2
      Diabetes, Chronic Kidney Disease, COPD, Heart Conditions, Smoking History,
      Cancer, Solid Organ Transplant, Sickle Cell Disease
    </label>

    <br></br>
    <strong>Essential Workers: </strong>
    <label>
      <input type="checkbox" name="frontlineEssential" ref={register} />
      Frontline Essential Workers
      <ul>
        <li>First Responders</li>
        <li>Education</li>
        <li>Food &amp; Agriculture</li>
        <li>Manufacturing</li>
        <li>Correction Workers</li>
        <li>U.S. postal Service Workers</li>
        <li>Public Transit Workers</li>
        <li>Grocery Store Workers </li>
      </ul>
    </label>
    <br></br>
    <label>
      <input type="checkbox" name="otherEssential" ref={register} />
      Other Essential Workers
      <ul>
        <li>Transportation &amp; Logistics</li>
        <li>Food Service</li>
        <li>Food &amp; Agriculture</li>
        <li>Manufacturing</li>
        <li>Correction Workers</li>
        <li>U.S. postal Service Workers</li>
        <li>Public Transit Workers</li>
        <li>Grocery Store Workers </li>
      </ul>
    </label>
    <Button type="button" onClick={() => setShowPatientModal(false)}>
      Save Changes
    </Button>
  </ModalGeneric>
);

export default EligibilitySelect;
