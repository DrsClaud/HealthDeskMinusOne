import React, { useContext } from "react";
import { Link } from "react-router-dom";
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { DrawerContext } from "context/DrawerContext";

const NavListItem = ({
  icon,
  text,
  secondary,
  link,
  onClick,
  disabled,
  noSelect,
  sx,
}) => {
  const open = useContext(DrawerContext);
  let external = false;
  if (link) {
    const pattern = /^((http|https):\/\/)/;
    external = pattern.test(link);
  }

  const inner = (
    <>
      <ListItemIcon
        sx={[
          { minWidth: 0, justifyContent: "center" },
          open ? { mr: 3 } : { mr: "auto" },
        ]}
      >
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={text}
        secondary={secondary}
        sx={{ opacity: open ? 1 : 0 }}
      />
    </>
  );

  const item = (
    <ListItem disablePadding onClick={onClick} disabled={disabled} sx={{ display: "block", ...sx }}>
      {onClick || link ? (
        <ListItemButton
          selected={noSelect ? false : window.location.pathname === link}
          sx={[
            { minHeight: 48, px: 2.5 },
            open ? { justifyContent: "initial" } : { justifyContent: "center" },
          ]}
        >
          {inner}
        </ListItemButton>
      ) : (
        inner
      )}
    </ListItem>
  );

  // Internal link
  if (link && !external) return <Link to={link}>{item}</Link>;

  // External link
  if (link && external)
    return (
      <Link to={link} target="_blank" rel="noreferrer">
        {item}
      </Link>
    );

  return item;
};

export default NavListItem;
