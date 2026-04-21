import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { FaUserCircle, FaArrowLeft, FaCommentDots } from "react-icons/fa";
import { FaPenToSquare } from "react-icons/fa6";

import Logo from "../styled/Logo";

const DesktopWrapper = styled.div`
  @media (min-width: 768px) {
    background-color: #eee;
    width: 330px;
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;

    div {
      position: relative;
    }
  }
`;

const TopNav = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  position: fixed;
  width: 100%;
  top: 0;
  z-index: 9;
  background-color: #eee;
  padding: 5px 5px 3px;

  .links {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .logo {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .links:first-child {
    margin-left: 0;
  }

  button {
    cursor: pointer;
    padding: 10px 5px;
    background: none;
    border: none;
    color: ${(props) => props.theme.colors.primary};

    a {
      color: ${(props) => props.theme.colors.primary};
    }
  }
`;

const PatientNav = ({ messages, newThread }) => {
  return (
    <DesktopWrapper>
      <TopNav>
        <div className="links">
          <Link to="/">
            <button>
              <FaArrowLeft size="18" color="#1B4584" />
            </button>
          </Link>
          <div className="logo">
            <Logo />
          </div>
        </div>

        <div className="links">
          {messages !== undefined ? (
            <button
              disabled={messages.length === 0}
              onClick={() => newThread()}
            >
              <FaPenToSquare
                size="18"
                color="#1B4584"
                style={{ opacity: messages.length === 0 ? 0.25 : 1 }}
              />
            </button>
          ) : null}
          <Link to="/dashboard">
            <button>
              <FaCommentDots size="18" color="#1B4584" />
            </button>
          </Link>
          <Link to="/dashboard/settings">
            <button>
              <FaUserCircle size="18" color="#1B4584" />
            </button>
          </Link>
        </div>
      </TopNav>
    </DesktopWrapper>
  );
};

export default PatientNav;
