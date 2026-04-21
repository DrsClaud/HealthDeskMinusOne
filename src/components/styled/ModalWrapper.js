import styled from "styled-components";

const ModalWrapper = styled.div`
  position: absolute;
  height: auto;
  padding: 10px;
  padding-bottom: 15px;
  left: 0;
  right: 0;
  bottom: ${({ $visible }) => ($visible ? "0" : "-100%")};
  margin: 0 auto;
  width: 100%;
  max-width: 980px;
  box-sizing: border-box;
  background: #fff;
  transition: 400ms ease-in-out bottom;
  z-index: 1001;

  .type {
    display: block;
    padding-bottom: 1rem;
    text-align: center;
    color: ${(props) => props.theme.colors.primary};
    font-weight: 600;
    font-size: 0.825rem;
  }

  .time {
    display: block;
    padding-bottom: 0.5rem;
    text-align: center;
    color: ${(props) => props.theme.colors.primary};
    font-size: 0.75rem;
  }
`;

export default ModalWrapper;
