import React from "react";
import styled from "styled-components";
import {
  EmailShareButton,
  FacebookShareButton,
  HatenaShareButton,
  InstapaperShareButton,
  LineShareButton,
  LinkedinShareButton,
  LivejournalShareButton,
  MailruShareButton,
  OKShareButton,
  PinterestShareButton,
  PocketShareButton,
  RedditShareButton,
  TelegramShareButton,
  TumblrShareButton,
  TwitterShareButton,
  ViberShareButton,
  VKShareButton,
  WhatsappShareButton,
  WorkplaceShareButton,
} from "react-share";
import {
  EmailIcon,
  FacebookIcon,
  FacebookMessengerIcon,
  HatenaIcon,
  InstapaperIcon,
  LineIcon,
  LinkedinIcon,
  LivejournalIcon,
  MailruIcon,
  OKIcon,
  PinterestIcon,
  PocketIcon,
  RedditIcon,
  TelegramIcon,
  TumblrIcon,
  TwitterIcon,
  ViberIcon,
  VKIcon,
  WeiboIcon,
  WhatsappIcon,
  WorkplaceIcon,
} from "react-share";
const ShareWrapper = styled.div`
  display: flex !important;
  width: 100%;
  justify-content: center;
  padding-top: ${({ $large }) => ($large ? "10px" : 0)};
  padding-bottom: ${({ $large }) => ($large ? "20px" : 0)};

  & > * {
    text-align: center;
    margin-left: 5px;
    margin-right: 5px;
  }

  @media (max-width: 768px) {
    display: ${({ $large }) => ($large ? "initial" : "none !important")};
  }
`;
const ShareButtons = ({ large }) => {
  return (
    <ShareWrapper $large={large}>
      <EmailShareButton
        subject={"I wanted you to see this site"}
        url={"https://hlthdsk.com."}
      >
        <EmailIcon size={large ? 54 : 32} round={true} />
      </EmailShareButton>
      <FacebookShareButton url="https://hlthdsk.com/">
        <FacebookIcon size={large ? 54 : 32} round={true} />
      </FacebookShareButton>
      <TwitterShareButton url="https://hlthdsk.com/">
        <TwitterIcon size={large ? 54 : 32} round={true} />
      </TwitterShareButton>
    </ShareWrapper>
  );
};

export default ShareButtons;
